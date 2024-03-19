import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount, InterfaceId } from "@gemunion/contracts-constants";
import { deployContract } from "@gemunion/contracts-mocks";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";

import { FrameworkInterfaceId, templateId, tokenId } from "../../constants";
import { deployERC20 } from "../../ERC20/shared/fixtures";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { deployERC1155 } from "../../ERC1155/shared/fixtures";
import { shouldReceive } from "../../shared/receive";

describe("Dispenser", function () {
  const factory = () => deployContract("Dispenser");

  shouldReceive(factory);

  describe("NATIVE", function () {
    it("should send ETH", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [receiver.address],
        { value: amount },
      );

      const lib = await ethers.getContractAt("ExchangeUtils", await contractInstance.getAddress(), owner);
      await expect(tx).to.emit(lib, "PaymentEthSent").withArgs(receiver.address, amount);

      await expect(tx).to.changeEtherBalances([owner, receiver], [-amount, amount]);
    });

    it("should send ETH (multiple)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [receiver.address, stranger.address],
        { value: amount * 2n },
      );

      const lib = await ethers.getContractAt("ExchangeUtils", await contractInstance.getAddress(), owner);
      await expect(tx)
        .to.emit(lib, "PaymentEthSent")
        .withArgs(receiver.address, amount)
        .to.emit(lib, "PaymentEthSent")
        .withArgs(stranger.address, amount);
    });

    it("should fail: WrongAmount", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [receiver.address],
        { value: amount / 2n },
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WrongAmount");
    });

    it("should fail: insufficient balance", async function () {
      const [_owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [receiver.address, stranger.address],
        { value: amount },
      );

      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AddressInsufficientBalance")
        .withArgs(await contractInstance.getAddress());
    });

    it("should fail: WrongArrayLength", async function () {
      const [_owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [receiver.address, stranger.address],
        { value: amount },
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WrongArrayLength");
    });

    it("should have reentrancy guard", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const attackerFactory = await ethers.getContractFactory("ReentrancyDispenser");
      const attackerInstance = await attackerFactory.deploy(await contractInstance.getAddress(), ZeroAddress);
      await owner.sendTransaction({
        to: await attackerInstance.getAddress(),
        value: amount * 5n,
      });

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        [await attackerInstance.getAddress()],
        { value: amount * 5n },
      );

      const lib = await ethers.getContractAt("ExchangeUtils", await contractInstance.getAddress(), owner);
      await expect(tx)
        .to.emit(lib, "PaymentEthSent")
        .withArgs(await attackerInstance.getAddress(), amount);

      await expect(tx).to.changeEtherBalances(
        [owner, await contractInstance.getAddress(), await attackerInstance.getAddress()],
        [-amount * 5n, amount * 4n, amount],
      );
    });
  });

  describe("ERC20", function () {
    it("should send ERC20", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const erc20Instance = await deployERC20();
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(await contractInstance.getAddress(), amount);

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        [receiver.address],
      );

      await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner.address, receiver.address, amount);
    });
  });

  describe("ERC721", function () {
    it("should transfer to AOE", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const erc721Instance = await deployERC721();
      await erc721Instance.mintCommon(owner.address, templateId);
      await erc721Instance.approve(await contractInstance.getAddress(), tokenId);

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        [receiver.address],
      );

      await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(owner.address, receiver.address, tokenId);
    });

    it("should have reentrancy guard", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      const attackerFactory = await ethers.getContractFactory("ReentrancyDispenser");
      const attackerInstance = await attackerFactory.deploy(
        await contractInstance.getAddress(),
        await erc721Instance.getAddress(),
      );

      await erc721Instance.mintCommon(owner.address, templateId);
      await erc721Instance.mintCommon(owner.address, templateId);
      await erc721Instance.setApprovalForAll(await contractInstance.getAddress(), true);

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        [await attackerInstance.getAddress()],
      );

      await expect(tx)
        .to.emit(erc721Instance, "Transfer")
        .withArgs(owner.address, await attackerInstance.getAddress(), tokenId);

      const ownerOf = await erc721Instance.ownerOf(2);
      expect(ownerOf).to.be.equal(owner.address);
    });
  });

  describe("ERC1155", function () {
    it("should transfer to AOE", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const erc1155Instance = await deployERC1155();
      await erc1155Instance.mint(owner.address, tokenId, amount, "0x");
      await erc1155Instance.setApprovalForAll(await contractInstance.getAddress(), true);

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        [receiver.address],
      );

      await expect(tx)
        .to.emit(erc1155Instance, "TransferSingle")
        .withArgs(await contractInstance.getAddress(), owner.address, receiver.address, tokenId, amount);
    });

    it("should have reentrancy guard", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();
      const erc1155Instance = await deployERC1155();

      const attackerFactory = await ethers.getContractFactory("ReentrancyDispenser");
      const attackerInstance = await attackerFactory.deploy(
        await contractInstance.getAddress(),
        await erc1155Instance.getAddress(),
      );

      await erc1155Instance.mint(owner.address, tokenId, amount * 2n, "0x");
      await erc1155Instance.setApprovalForAll(await contractInstance.getAddress(), true);

      const tx = contractInstance.disperse(
        [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        [await attackerInstance.getAddress()],
      );

      await expect(tx)
        .to.emit(erc1155Instance, "TransferSingle")
        .withArgs(
          await contractInstance.getAddress(),
          owner.address,
          await attackerInstance.getAddress(),
          tokenId,
          amount,
        );
    });
  });

  shouldSupportsInterface(factory)([InterfaceId.IERC165, FrameworkInterfaceId.Dispenser]);
});
