import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@gemunion/contracts-constants";

import { templateId, tokenId } from "../constants";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { deployBusd, deployERC1363, deployERC20, deployUsdt, deployWeth } from "../ERC20/shared/fixtures";
import { deployERC998 } from "../ERC998/shared/fixtures";
import { deployERC1155 } from "../ERC1155/shared/fixtures";
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

      const lib = await ethers.getContractAt("ExchangeUtils", await contractInstance.getAddress(), owner);

      await expect(tx)
        .to.emit(lib, "PaymentEthReceived")
        .withArgs(await contractInstance.getAddress(), amount);
      await expect(tx).to.changeEtherBalances([owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC20 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployERC20();
      await erc20Instance.mint(owner.address, amount);

      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC1363 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployERC1363();
      await erc20Instance.mint(owner.address, amount);

      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx)
        .to.emit(contractInstance, "TransferReceived")
        .withArgs(await contractInstance.getAddress(), owner.address, amount, "0x");

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with USDT token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployUsdt();

      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with BUSD token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc20Instance = await deployBusd();

      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
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

      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, contractInstance], [-amount, amount]);
    });

    it("should top-up with ERC721 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc721Instance = await deployERC721();
      await erc721Instance.mintCommon(owner.address, templateId);

      await erc721Instance.approve(await contractInstance.getAddress(), tokenId);

      const tx = contractInstance.topUp([
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx).to.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });

    it("should top-up with ERC998 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc998Instance = await deployERC998();
      await erc998Instance.mintCommon(owner.address, templateId);

      await erc998Instance.approve(await contractInstance.getAddress(), tokenId);

      const tx = contractInstance.topUp([
        {
          tokenType: 3,
          token: await erc998Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      await expect(tx).to.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });

    it("should top-up with ERC1155 token", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const erc1155Instance = await deployERC1155();
      await erc1155Instance.mint(owner.address, templateId, amount, "0x");

      await erc1155Instance.setApprovalForAll(await contractInstance.getAddress(), true);

      const tx = contractInstance.topUp([
        {
          tokenType: 4,
          token: await erc1155Instance.getAddress(),
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

      await expect(tx).to.revertedWithoutReason();
      // await expect(tx).to.be.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });
  });

  shouldReceive(factory);
}
