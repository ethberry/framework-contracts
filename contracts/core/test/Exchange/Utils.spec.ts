import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ZeroAddress } from "ethers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";
import { deployRejector, deployHolder } from "@gemunion/contracts-finance";
import { deployContract } from "@gemunion/contracts-utils";

import { VRFCoordinatorV2PlusMock } from "../../typechain-types";
import { templateId, tokenId } from "../constants";
import { deployERC1363, deployERC20 } from "../ERC20/shared/fixtures";
import { deployLinkVrfFixture } from "../shared/link";
import { randomRequest } from "../shared/randomRequest";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { deployERC1155 } from "../ERC1155/shared/fixtures";
import { deployDiamond } from "./shared";

const disabled = {
  native: false,
  erc20: false,
  erc721: false,
  erc998: false,
  erc1155: false,
};

const enabled = {
  native: true,
  erc20: true,
  erc721: true,
  erc998: true,
  erc1155: true,
};

describe("Diamond Exchange Utils", function () {
  const factory = async (facetName = "ExchangeMockFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondExchange", [facetName, "WalletFacet"], "DiamondExchangeInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, diamondInstance);
  };

  describe.only("ExchangeUtils", function () {
    describe("spendFrom", function () {
      describe("ETH", function () {
        it("should spendFrom: ETH => SELF", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            exchangeInstance,
            enabled,
            { value: amount },
          );

          await expect(tx).changeEtherBalances([owner, exchangeInstance], [-amount, amount]);
          await expect(tx).to.emit(exchangeInstance, "PaymentReceived").withArgs(exchangeInstance, amount);
        });

        it("should spendFrom: ETH => SELF + tips", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            exchangeInstance,
            enabled,
            { value: amount + 100n },
          );

          await expect(tx).changeEtherBalances([owner, exchangeInstance], [-amount, amount]);
          await expect(tx).to.emit(exchangeInstance, "PaymentReceived").withArgs(exchangeInstance, amount);
        });

        it("should spendFrom: ETH => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
            { value: amount },
          );

          await expect(tx).changeEtherBalances([owner, receiver], [-amount, amount]);
          await expect(tx).to.emit(exchangeInstance, "PaymentReleased").withArgs(receiver, amount);
        });

        it("should spendFrom: ETH => EOA + tips", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
            { value: amount + 100n },
          );

          await expect(tx).changeEtherBalances([owner, receiver], [-amount, amount]);
          await expect(tx).to.emit(exchangeInstance, "PaymentReleased").withArgs(receiver, amount);
        });

        it("should spendFrom: ETH => Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployContract("NativeReceiver");
          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
            { value: amount },
          );

          await expect(tx).changeEtherBalances([owner, walletInstance], [-amount, amount]);
        });

        it("should spendFrom: ETH => ZeroAddress (ETHInvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
            { value: amount },
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ETHInvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spendFrom: ETH => EOA (ETHInsufficientBalance)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
            { value: 0 },
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ETHInsufficientBalance");
        });

        it("should spendFrom: ETH => Reverter (FailedInnerCall)", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();
          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
            { value: amount },
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "FailedInnerCall");
        });
      });

      describe("ERC20", function () {
        it("should spendFrom: ERC20 => ERC1363 non Holder", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();
          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, jerkInstance, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [owner, jerkInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC20 => ERC1363 Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployHolder();
          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(owner, walletInstance, amount)
            .not.to.emit(walletInstance, "TransferReceived");
          await expect(tx).changeTokenBalances(erc20Instance, [owner, walletInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC20 => SELF", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const walletInstance = await ethers.getContractAt("WalletFacet", exchangeInstance);

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            exchangeInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(owner, exchangeInstance, amount)
            .not.to.emit(walletInstance, "TransferReceived");
          await expect(tx).changeTokenBalances(erc20Instance, [owner, exchangeInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC20 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, receiver, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [owner, receiver], [-amount, amount]);
        });

        it("should spendFrom: ERC20 => ZeroAddress (ERC20InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spendFrom: ERC20 => EOA (ERC20InsufficientBalance)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          // await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
            .withArgs(owner, 0, amount);
        });

        it("should spendFrom: ERC20 => EOA (ERC20InsufficientAllowance)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          // await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
            .withArgs(exchangeInstance, 0, amount);
        });

        it("should spendFrom: ERC1363 => ERC1363 non Holder", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, jerkInstance, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [owner, jerkInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC1363 => ERC1363 Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(owner, walletInstance, amount)
            .to.emit(walletInstance, "TransferReceived");
          await expect(tx).changeTokenBalances(erc20Instance, [owner, walletInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC1363 => SELF", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const walletInstance = await ethers.getContractAt("WalletFacet", exchangeInstance);

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            exchangeInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(owner, exchangeInstance, amount)
            .to.emit(walletInstance, "TransferReceived");
          await expect(tx).changeTokenBalances(erc20Instance, [owner, exchangeInstance], [-amount, amount]);
        });

        it("should spendFrom: ERC1363 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, receiver, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [owner, receiver], [-amount, amount]);
        });

        it("should spendFrom: ERC1363 => ZeroAddress (ERC20InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });
      });

      describe("ERC721", function () {
        it("should spendFrom: ERC721 => non Holder", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc721Instance, "ERC721InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spendFrom: ERC721 => Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(owner, walletInstance, tokenId);

          const balance = await erc721Instance.balanceOf(walletInstance);
          expect(balance).to.equal(1);
        });

        it("should spendFrom: ERC721 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(owner, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should spendFrom: ERC721 => ZeroAddress (ERC721InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc721Instance, "ERC721InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spendFrom: ERC721 => EOA (ERC721IncorrectOwner)", async function () {
          const [owner, receiver, stranger] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(stranger.address, templateId);
          await erc721Instance.connect(stranger).approve(exchangeInstance, tokenId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc721Instance, "ERC721IncorrectOwner")
            .withArgs(owner, tokenId, stranger);
        });

        it("should spendFrom: ERC721 => EOA (ERC721InsufficientApproval)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          // await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc721Instance, "ERC721InsufficientApproval")
            .withArgs(exchangeInstance, tokenId);
        });
      });

      describe("ERC998", function () {
        it("should spendFrom: ERC998 => non Holder", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc998Instance, "ERC721InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spendFrom: ERC998 => Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(owner, walletInstance, tokenId);

          const balance = await erc998Instance.balanceOf(walletInstance);
          expect(balance).to.equal(1);
        });

        it("should spendFrom: ERC998 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(owner, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should spendFrom: ERC998 => ZeroAddress (ERC721InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc998Instance, "ERC721InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spendFrom: ERC998 => EOA (ERC721IncorrectOwner)", async function () {
          const [owner, receiver, stranger] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(stranger.address, templateId);
          await erc998Instance.connect(stranger).approve(exchangeInstance, tokenId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc998Instance, "ERC721IncorrectOwner")
            .withArgs(owner, tokenId, stranger);
        });

        it("should spendFrom: ERC998 => EOA (ERC721InsufficientApproval)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          // await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc998Instance, "ERC721InsufficientApproval")
            .withArgs(exchangeInstance, tokenId);
        });
      });

      describe("ERC1155", function () {
        it("should spendFrom: ERC1155 => non Holder", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spendFrom: ERC1155 => Holder", async function () {
          const [owner] = await ethers.getSigners();

          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, owner, walletInstance, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(walletInstance, templateId);
          expect(balance).to.equal(amount);
        });

        it("should spendFrom: ERC1155 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, owner, receiver, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(receiver, 1);
          expect(balance).to.equal(amount);
        });

        it("should spendFrom: ERC1155 => ZeroAddress (ERC1155InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            ZeroAddress,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InvalidReceiver")
            .withArgs(ZeroAddress);
        });

        it("should spendFrom: ERC1155 => EOA (ERC1155InsufficientBalance)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          // await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.connect(receiver).testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InsufficientBalance")
            .withArgs(owner, 0, amount, tokenId);
        });

        it("should spendFrom: ERC1155 => EOA (ERC1155MissingApprovalForAll)", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          // await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.connect(receiver).testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155MissingApprovalForAll")
            .withArgs(exchangeInstance, owner);
        });
      });

      describe("Disabled", function () {
        it("should fail spendFrom: ETH", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            receiver,
            disabled,
            { value: amount },
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spendFrom: ERC20", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spendFrom: ERC721", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spendFrom: ERC998", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spendFrom: ERC1155", async function () {
          const [owner] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testSpendFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });
    });

    describe("spend", function () {
      describe("ETH", function () {
        it("should spend: ETH => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx1 = await exchangeInstance.topUp(
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

          const lib = await ethers.getContractAt("ExchangeUtils", exchangeInstance, owner);

          await expect(tx1).to.emit(lib, "PaymentReceived").withArgs(exchangeInstance, amount);
          await expect(tx1).to.changeEtherBalances([owner, exchangeInstance], [-amount, amount]);

          const tx2 = exchangeInstance.testSpend(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx2).changeEtherBalances([exchangeInstance, receiver], [-amount, amount]);
        });

        it("should spend: ETH => ZeroAddress (ETHInvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx1 = await exchangeInstance.topUp(
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

          const lib = await ethers.getContractAt("ExchangeUtils", exchangeInstance, owner);

          await expect(tx1).to.emit(lib, "PaymentReceived").withArgs(exchangeInstance, amount);
          await expect(tx1).to.changeEtherBalances([owner, exchangeInstance], [-amount, amount]);

          const tx2 = exchangeInstance.testSpend(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ETHInvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spend: ETH => EOA (AddressInsufficientBalance)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(exchangeInstance, "AddressInsufficientBalance")
            .withArgs(exchangeInstance);
        });
      });

      describe("ERC20", function () {
        it("should spend: ERC20 => ERC1363 non Holder", async function () {
          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(exchangeInstance, jerkInstance, amount);

          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, jerkInstance], [-amount, amount]);
        });

        it("should spend: ERC20 => ERC1363 Holder", async function () {
          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(exchangeInstance, walletInstance, amount)
            .not.to.emit(walletInstance, "TransferReceived");

          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, walletInstance], [-amount, amount]);
        });

        it("should spend: ERC20 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(exchangeInstance, receiver, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, receiver], [-amount, amount]);
        });

        it("should spend: ERC20 => ZeroAddress (ERC20InvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spend: ERC20 => EOA (ERC20InsufficientBalance)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          // await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
            .withArgs(exchangeInstance, 0, amount);
        });

        it("should spend: ERC1363 => ERC1363 non Holder", async function () {
          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(exchangeInstance, jerkInstance, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, jerkInstance], [-amount, amount]);
        });

        it("should spend: ERC1363 => ERC1363 Holder", async function () {
          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc20Instance, "Transfer")
            .withArgs(exchangeInstance, walletInstance, amount)
            .to.emit(walletInstance, "TransferReceived");

          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, walletInstance], [-amount, amount]);
        });

        it("should spend: ERC1363 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(exchangeInstance, receiver, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, receiver], [-amount, amount]);
        });

        it("should spend: ERC1363 => ZeroAddress (ERC20InvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc20Instance = await deployERC1363("ERC20Simple");
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });
      });

      describe("ERC721", function () {
        it("should spend: ERC721 => non Holder", async function () {
          const exchangeInstance = await factory();

          const jerkInstance = await deployRejector();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc721Instance, "ERC721InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spend: ERC721 => Holder", async function () {
          const exchangeInstance = await factory();

          const walletInstance = await deployHolder();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            walletInstance,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(exchangeInstance, walletInstance, tokenId);

          const balance = await erc721Instance.balanceOf(walletInstance);
          expect(balance).to.equal(1);
        });

        it("should spend: ERC721 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(exchangeInstance, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should spend: ERC721 => ZeroAddress (ERC721InvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc721Instance, "ERC721InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spend: ERC721 => EOA (ERC721InsufficientApproval)", async function () {
          const [_owner, receiver, stranger] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(stranger.address, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc721Instance, "ERC721InsufficientApproval")
            .withArgs(exchangeInstance, tokenId);
        });
      });

      describe("ERC998", function () {
        it("should spend: ERC998 => non Holder", async function () {
          const exchangeInstance = await factory();

          const jerkInstance = await deployRejector();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc998Instance, "ERC721InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spend: ERC998 => Holder", async function () {
          const exchangeInstance = await factory();
          const walletInstance = await deployHolder();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            walletInstance,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(exchangeInstance, walletInstance, tokenId);

          const balance = await erc998Instance.balanceOf(walletInstance);
          expect(balance).to.equal(1);
        });

        it("should spend: ERC998 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(exchangeInstance, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should spend: ERC998 => ZeroAddress (ERC721InvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc998Instance, "ERC721InvalidReceiver").withArgs(ZeroAddress);
        });

        it("should spend: ERC998 => EOA (ERC721InsufficientApproval)", async function () {
          const [_owner, receiver, stranger] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(stranger.address, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc998Instance, "ERC721InsufficientApproval")
            .withArgs(exchangeInstance, tokenId);
        });
      });

      describe("ERC1155", function () {
        it("should spend: ERC1155 => non Holder", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.connect(receiver).testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InvalidReceiver")
            .withArgs(jerkInstance);
        });

        it("should spend: ERC1155 => Holder", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const walletInstance = await deployHolder();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.connect(receiver).testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            walletInstance,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, exchangeInstance, walletInstance, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(walletInstance, templateId);
          expect(balance).to.equal(amount);
        });

        it("should spend: ERC1155 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, exchangeInstance, receiver, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(receiver, templateId);
          expect(balance).to.equal(amount);
        });

        it("should spend: ERC1155 => ZeroAdress (ERC1155InvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InvalidReceiver")
            .withArgs(ZeroAddress);
        });

        it("should spend: ERC1155 => EOA (ERC1155InsufficientBalance)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          // await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.connect(receiver).testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InsufficientBalance")
            .withArgs(exchangeInstance, 0, amount, tokenId);
        });
      });

      describe("Disabled", function () {
        it("should fail spend: ETH", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            owner,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spend: ERC20", async function () {
          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spend: ERC721", async function () {
          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            erc721Instance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spend: ERC998", async function () {
          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(exchangeInstance, templateId);

          const tx = exchangeInstance.testSpend(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            erc998Instance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail spend: ERC1155", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const jerkInstance = await deployRejector();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(exchangeInstance, templateId, amount, "0x");

          const tx = exchangeInstance.connect(receiver).testSpend(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            jerkInstance,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });
    });

    describe("acquire", function () {
      describe("ETH", function () {
        it("should mint: ETH => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx1 = await exchangeInstance.topUp(
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

          const lib = await ethers.getContractAt("ExchangeUtils", exchangeInstance, owner);
          await expect(tx1).to.emit(lib, "PaymentReceived").withArgs(exchangeInstance, amount);
          await expect(tx1).to.changeEtherBalances([owner, exchangeInstance], [-amount, amount]);

          const tx2 = exchangeInstance.testAcquire(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx2).to.emit(lib, "PaymentReleased").withArgs(receiver, amount);
          await expect(tx2).changeEtherBalances([exchangeInstance, receiver], [-amount, amount]);
        });

        it("should mint: ETH => ZeroAddress (ETHInvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx1 = await exchangeInstance.topUp(
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

          const lib = await ethers.getContractAt("ExchangeUtils", exchangeInstance, owner);
          await expect(tx1).to.emit(lib, "PaymentReceived").withArgs(exchangeInstance, amount);
          await expect(tx1).to.changeEtherBalances([owner, exchangeInstance], [-amount, amount]);

          const tx2 = exchangeInstance.testAcquire(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ETHInvalidReceiver").withArgs(ZeroAddress);
        });
      });

      describe("ERC20", function () {
        it("should mint: ERC20 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(exchangeInstance, receiver, amount);

          await expect(tx).changeTokenBalances(erc20Instance, [exchangeInstance, receiver], [-amount, amount]);
        });

        it("should mint: ERC20 => ZeroAddress (ETHInvalidReceiver)", async function () {
          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });
      });

      describe("ERC721", function () {
        let vrfInstance: VRFCoordinatorV2PlusMock;
        let subId: bigint;

        before(async function () {
          await network.provider.send("hardhat_reset");

          // https://github.com/NomicFoundation/hardhat/issues/2980
          ({ vrfInstance, subId } = await loadFixture(function staking() {
            return deployLinkVrfFixture();
          }));
        });

        it("should mint: ERC721 => EOA (Simple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 1,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC721 => EOA (Random)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Random");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          await erc721Instance.grantRole(MINTER_ROLE, vrfInstance);
          await erc721Instance.setSubscriptionId(subId);
          await vrfInstance.addConsumer(subId, erc721Instance);

          await exchangeInstance.testAcquire(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 1,
              },
            ],
            receiver,
            enabled,
          );

          await randomRequest(erc721Instance, vrfInstance);

          // await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC721 => EOA (Multiple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 3,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 1)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 2)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 3);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(3);
        });
      });

      describe("ERC998", function () {
        let vrfInstance: VRFCoordinatorV2PlusMock;
        let subId: bigint;

        before(async function () {
          await network.provider.send("hardhat_reset");

          // https://github.com/NomicFoundation/hardhat/issues/2980
          ({ vrfInstance, subId } = await loadFixture(function staking() {
            return deployLinkVrfFixture();
          }));
        });

        it("should mint: ERC998 => EOA (Simple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 1n,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC998 => EOA (Random)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Random");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          // Set VRFV2 Subscription
          await erc998Instance.grantRole(MINTER_ROLE, vrfInstance);
          await erc998Instance.setSubscriptionId(subId);
          await vrfInstance.addConsumer(subId, erc998Instance);

          await exchangeInstance.testAcquire(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 1n,
              },
            ],
            receiver,
            enabled,
          );

          await randomRequest(erc998Instance, vrfInstance);

          // await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC998 => EOA (Multiple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 3n,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 1)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 2)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 3);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(3);
        });
      });

      describe("ERC1155", function () {
        it("should mint: ERC1155 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, ZeroAddress, receiver, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(receiver, tokenId);
          expect(balance).to.equal(amount);
        });
      });

      describe("Disabled", function () {
        it("should fail acquire: ETH", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC20", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC721", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount,
              },
            ],
            receiver,
            disabled,
          );
          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC998", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount,
              },
            ],
            receiver,
            disabled,
          );
          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC1155", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });
    });

    describe("acquireFrom", function () {
      describe("ETH", function () {
        it("should fail: UnsoportedTokenType", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          await ethers.getContractAt("ExchangeUtils", exchangeInstance, owner);

          const tx1 = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
            { value: amount },
          );
          await expect(tx1).to.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });

      describe("ERC20", function () {
        it("should mint: ERC20 => EOA", async function () {
          const [owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);

          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, receiver, amount);

          await expect(tx).changeTokenBalances(erc20Instance, [owner, receiver], [-amount, amount]);
        });

        it("should mint: ERC20 => ZeroAddress (ERC20InvalidReceiver)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);

          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            ZeroAddress,
            enabled,
          );

          await expect(tx).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
        });
      });

      describe("ERC721", function () {
        let vrfInstance: VRFCoordinatorV2PlusMock;
        let subId: bigint;

        before(async function () {
          await network.provider.send("hardhat_reset");

          // https://github.com/NomicFoundation/hardhat/issues/2980
          ({ vrfInstance, subId } = await loadFixture(function staking() {
            return deployLinkVrfFixture();
          }));
        });

        it("should mint: ERC721 => EOA (Simple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 1,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC721 => EOA (Random)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Random");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          await erc721Instance.grantRole(MINTER_ROLE, vrfInstance);
          await erc721Instance.setSubscriptionId(subId);
          await vrfInstance.addConsumer(subId, erc721Instance);

          await exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 1,
              },
            ],
            receiver,
            enabled,
          );

          await randomRequest(erc721Instance, vrfInstance);

          // await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC721 => EOA (Multiple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount: 3,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 1)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 2)
            .to.emit(erc721Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 3);

          const balance = await erc721Instance.balanceOf(receiver);
          expect(balance).to.equal(3);
        });
      });

      describe("ERC998", function () {
        let vrfInstance: VRFCoordinatorV2PlusMock;
        let subId: bigint;

        before(async function () {
          await network.provider.send("hardhat_reset");

          // https://github.com/NomicFoundation/hardhat/issues/2980
          ({ vrfInstance, subId } = await loadFixture(function staking() {
            return deployLinkVrfFixture();
          }));
        });

        it("should mint: ERC998 => EOA (Simple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 1n,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC998 => EOA (Random)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Random");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          // Set VRFV2 Subscription
          await erc998Instance.grantRole(MINTER_ROLE, vrfInstance);
          await erc998Instance.setSubscriptionId(subId);
          await vrfInstance.addConsumer(subId, erc998Instance);

          await exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 1n,
              },
            ],
            receiver,
            enabled,
          );

          await randomRequest(erc998Instance, vrfInstance);

          // await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(1);
        });

        it("should mint: ERC998 => EOA (Multiple)", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount: 3n,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 1)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 2)
            .to.emit(erc998Instance, "Transfer")
            .withArgs(ZeroAddress, receiver, 3);

          const balance = await erc998Instance.balanceOf(receiver);
          expect(balance).to.equal(3);
        });
      });

      describe("ERC1155", function () {
        it("should mint: ERC1155 => EOA", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquire(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, ZeroAddress, receiver, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(receiver, tokenId);
          expect(balance).to.equal(amount);
        });
      });

      describe("Disabled", function () {
        it("should fail acquire: ETH", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC20", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(exchangeInstance, amount);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC721", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId: templateId,
                amount,
              },
            ],
            receiver,
            disabled,
          );
          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC998", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId: templateId,
                amount,
              },
            ],
            receiver,
            disabled,
          );
          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail acquire: ERC1155", async function () {
          const [_owner, receiver] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.grantRole(MINTER_ROLE, exchangeInstance);

          const tx = exchangeInstance.testAcquireFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            receiver,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });
    });

    describe("burnFrom", function () {
      describe("ETH", function () {
        it("should burnFrom: ETH (UnsupportedTokenType)", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();
          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            enabled,
            { value: amount },
          );

          await expect(tx).to.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });

      describe("ERC20", function () {
        it("should burnFrom: ERC20", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            enabled,
          );

          await expect(tx).to.emit(erc20Instance, "Transfer").withArgs(owner, ZeroAddress, amount);
          await expect(tx).changeTokenBalances(erc20Instance, [owner], [-amount]);
        });
      });

      describe("ERC721", function () {
        it("should burnFrom: ERC721", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            enabled,
          );

          await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(owner, ZeroAddress, tokenId);

          const balance = await erc721Instance.balanceOf(owner);
          expect(balance).to.equal(0);

          const tx2 = erc721Instance.ownerOf(tokenId);
          await expect(tx2).to.be.revertedWithCustomError(erc721Instance, "ERC721NonexistentToken").withArgs(tokenId);
        });
      });

      describe("ERC998", function () {
        it("should burnFrom: ERC998", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            enabled,
          );

          await expect(tx).to.emit(erc998Instance, "Transfer").withArgs(owner, ZeroAddress, tokenId);

          const balance = await erc998Instance.balanceOf(owner);
          expect(balance).to.equal(0);

          const tx2 = erc998Instance.ownerOf(tokenId);
          await expect(tx2).to.be.revertedWithCustomError(erc998Instance, "ERC721NonexistentToken").withArgs(tokenId);
        });
      });

      describe("ERC1155", function () {
        it("should burnFrom: ERC1155", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            enabled,
          );

          await expect(tx)
            .to.emit(erc1155Instance, "TransferSingle")
            .withArgs(exchangeInstance, owner, ZeroAddress, tokenId, amount);

          const balance = await erc1155Instance.balanceOf(owner, tokenId);
          expect(balance).to.equal(0);
        });
      });

      describe("Disabled", function () {
        it("should fail burnFrom: ETH", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 0,
                token: ZeroAddress,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            disabled,
            { value: amount },
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail burnFrom: ERC20", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc20Instance = await deployERC20();
          await erc20Instance.mint(owner, amount);
          await erc20Instance.approve(exchangeInstance, amount);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 1,
                token: erc20Instance,
                tokenId: 0,
                amount,
              },
            ],
            owner,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail burnFrom: ERC721", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc721Instance = await deployERC721("ERC721Simple");
          await erc721Instance.mintCommon(owner, templateId);
          await erc721Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 2,
                token: erc721Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail burnFrom: ERC998", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc998Instance = await deployERC721("ERC998Simple");
          await erc998Instance.mintCommon(owner, templateId);
          await erc998Instance.approve(exchangeInstance, templateId);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 3,
                token: erc998Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });

        it("should fail burnFrom: ERC1155", async function () {
          const [owner] = await ethers.getSigners();

          const exchangeInstance = await factory();

          const erc1155Instance = await deployERC1155("ERC1155Simple");
          await erc1155Instance.mint(owner, templateId, amount, "0x");
          await erc1155Instance.setApprovalForAll(exchangeInstance, true);

          const tx = exchangeInstance.testBurnFrom(
            [
              {
                tokenType: 4,
                token: erc1155Instance,
                tokenId,
                amount,
              },
            ],
            owner,
            disabled,
          );

          await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
        });
      });
    });
  });
});
