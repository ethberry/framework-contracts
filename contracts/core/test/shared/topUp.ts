import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@gemunion/contracts-constants";
import { deployERC1363Mock, deployERC20Mock, deployERC1155Mock, deployERC721Mock } from "@gemunion/contracts-mocks";

import { templateId, tokenId } from "../constants";
import { deployUsdt, deployWeth } from "../ERC20/shared/fixtures";
import { deployERC998 } from "../ERC998/shared/fixtures";
import { shouldReceive } from "./receive";

export function shouldBehaveLikeTopUp(factory: () => Promise<any>) {
  describe("topUp", function () {
    it("should top-up with NATIVE token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        { value: amount },
      );

      const lib = await ethers.getContractAt("ExchangeUtils", contractInstance, owner);

      await expect(tx).to.emit(lib, "PaymentReceived").withArgs(contractInstance, amount);
      await expect(tx).to.changeEtherBalances([owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC20 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployERC20Mock();
      await erc20Instance.mint(owner, amount);

      await erc20Instance.approve(contractInstance, amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC1363 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployERC1363Mock();
      await erc20Instance.mint(owner, amount);

      await erc20Instance.approve(contractInstance, amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId,
          amount,
        },
      ]);

      await expect(tx).to.emit(contractInstance, "TransferReceived").withArgs(contractInstance, owner, amount, "0x");

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with USDT token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployUsdt();

      await erc20Instance.approve(contractInstance, amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with WETH token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployWeth();

      await erc20Instance.approve(contractInstance, amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC721 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc721Instance = await deployERC721Mock();
      await erc721Instance.mint(owner, tokenId);

      await erc721Instance.approve(contractInstance, tokenId);

      const tx = contractInstance.topUp([
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1n,
        },
      ]);

      await expect(tx).to.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });

    it("should top-up with ERC998 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc998Instance = await deployERC998();
      await erc998Instance.mintCommon(owner, templateId);

      await erc998Instance.approve(contractInstance, tokenId);

      const tx = contractInstance.topUp([
        {
          tokenType: 3,
          token: erc998Instance,
          tokenId,
          amount: 1,
        },
      ]);

      await expect(tx).to.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });

    it("should top-up with ERC1155 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc1155Instance = await deployERC1155Mock();
      await erc1155Instance.mint(owner, templateId, amount, "0x");

      await erc1155Instance.setApprovalForAll(contractInstance, true);

      const tx = contractInstance.topUp([
        {
          tokenType: 4,
          token: erc1155Instance,
          tokenId,
          amount,
        },
      ]);

      await expect(tx).to.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });

    it("should top-up with UNSUPPORTED token", async function () {
      const contractInstance = await factory();

      const tx = contractInstance.topUp([
        {
          tokenType: 5,
          token: ZeroAddress,
          tokenId,
          amount,
        },
      ]);

      // I wish it throws UnsupportedTokenType but if fails even earlier
      // await expect(tx).to.be.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
      await expect(tx).to.revertedWithoutReason();
    });
  });

  shouldReceive(factory);
}
