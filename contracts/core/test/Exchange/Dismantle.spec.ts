import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, encodeBytes32String, ZeroAddress, ZeroHash } from "ethers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";

import { isEqualArray, isEqualEventArgArrObj } from "../utils";
import { expiresAt, externalId, extra, params, templateId, tokenId } from "../constants";
import { deployDiamond, deployErc1155Base, deployErc20Base, deployErc721Base } from "./shared";
import { wrapManyToManySignature, wrapOneToManySignature, wrapOneToOneSignature } from "./shared/utils";

describe("Diamond Exchange Dismantle", function () {
  const factory = async (facetName = "ExchangeDismantleFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet", "WalletFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const generateOneToOneSignature = wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
    const generateOneToManySignature = wrapOneToManySignature(network, contractInstance, "EXCHANGE", owner);
    const generateManyToManySignature = wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);

    return {
      generateOneToOneSignature,
      generateOneToManySignature,
      generateManyToManySignature,
    };
  };

  describe("dismantle", function () {
    describe("ERC721 > NULL", function () {
      it("should dismantle", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params,
          items: [],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          params,
          [],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualArray([]),
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            }),
          );
      });
    });

    describe("ERC1155 > NULL", function () {
      it("should dismantle", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params,
          items: [],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          params,
          [],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualArray([]),
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(await exchangeInstance.getAddress(), receiver.address, ZeroAddress, tokenId, amount);
      });
    });

    describe("ERC721 > NATIVE", function () {
      it("should fail: UnsupportedTokenType", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
      });
    });

    describe("ERC721 > ERC20", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
        });

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 1n,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            }),
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721Instance, "Transfer")
          .withArgs(receiver.address, ZeroAddress, tokenId)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner.address, receiver.address, amount);
      });

      it("should fail: insufficient allowance", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
        });

        await erc20Instance.mint(owner.address, amount);
        // await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
          .withArgs(await exchangeInstance.getAddress(), 0, amount);
      });

      it("should fail: ERC20InsufficientBalance", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
        });

        // await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
          .withArgs(owner.address, 0, amount);
      });
    });

    describe("ERC1155 > ERC721", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          // https://github.com/TrueFiEng/Waffle/pull/751
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            }),
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(await exchangeInstance.getAddress(), receiver.address, ZeroAddress, tokenId, amount);
      });

      it("should fail: ERC1155MissingApprovalForAll", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        // await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          params,
          [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc1155Instance, "ERC1155MissingApprovalForAll")
          .withArgs(await exchangeInstance.getAddress(), receiver.address);
      });

      it("should fail: ERC1155InsufficientBalance", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        // await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          params,
          [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InsufficientBalance")
          .withArgs(receiver.address, 0, amount, tokenId);
      });
    });

    describe("ERC1155 > NATIVE", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "UnsupportedTokenType");
      });
    });

    describe("ERC1155 > ERC20", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 1n,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            }),
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(await exchangeInstance.getAddress(), receiver.address, ZeroAddress, tokenId, amount)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner.address, receiver.address, amount);
      });

      it("should fail: ERC20InsufficientAllowance", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc20Instance.mint(owner.address, amount);
        // await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
          .withArgs(await exchangeInstance.getAddress(), 0, amount);
      });

      it("should fail: ERC1155InsufficientBalance", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        // await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
          .withArgs(owner.address, 0, amount);
      });
    });

    describe("ERC1155 > ERC1155", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId: 2n,
              amount,
            }),
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(await exchangeInstance.getAddress(), ZeroAddress, receiver.address, 2n, amount);
      });

      it("should fail: ERC1155MissingApprovalForAll", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        // await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc1155Instance, "ERC1155MissingApprovalForAll")
          .withArgs(await exchangeInstance.getAddress(), receiver.address);
      });

      it("should fail: ERC1155InsufficientBalance", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          price: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        // await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
        await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId: 2,
              amount,
            },
          ],
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
          signature,
        );

        await expect(tx1)
          .to.be.revertedWithCustomError(erc1155Instance, "ERC1155InsufficientBalance")
          .withArgs(receiver.address, 0, amount, tokenId);
      });
    });

    describe("ERC721 > ERC20 + ERC721", function () {
      it("should dismantle", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);
        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await exchangeInstance.getAddress(), amount);

        const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
        await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId: 2,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId, // dismantled 721 token
              amount: 1,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).dismantle(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId: 2,
              amount: 1,
            },
          ],
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId, // dismantled 721 token
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Dismantle")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj(
              {
                tokenType: 1n,
                token: await erc20Instance.getAddress(),
                tokenId,
                amount,
              },
              {
                tokenType: 2n,
                token: await erc721Instance.getAddress(),
                tokenId: 2n,
                amount: 1n,
              },
            ),
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721Instance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, 2n)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner.address, receiver.address, amount);
      });
    });
  });

  describe("ERROR", function () {
    it("should fail: ExpiredSignature", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateManyToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
      await erc721Instance.connect(receiver).approve(await exchangeInstance.getAddress(), tokenId);

      const signature = await generateManyToManySignature({
        account: receiver.address,
        params,
        items: [],
        price: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).dismantle(
        params,
        [],
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
        signature,
      );

      await expect(tx1).to.emit(exchangeInstance, "Dismantle");

      const tx2 = exchangeInstance.connect(receiver).dismantle(
        params,
        [],
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
        signature,
      );
      await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: ECDSAInvalidSignature", async function () {
      const exchangeInstance = await factory();
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const tx = exchangeInstance.dismantle(
        params,
        [],
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId, // dismantled 721 token
          amount: 1,
        },
        encodeBytes32String("signature").padEnd(132, "0"),
      );

      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignature");
    });

    it("should fail: ECDSAInvalidSignatureLength", async function () {
      const exchangeInstance = await factory();

      const tx = exchangeInstance.dismantle(
        params,
        [],
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId,
          amount: 1,
        },
        encodeBytes32String("signature"),
      );

      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignatureLength");
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateManyToManySignature } = await getSignatures(exchangeInstance);

      const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

      const signature = await generateManyToManySignature({
        account: receiver.address,
        params,
        items: [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      await erc1155Instance.mint(receiver.address, tokenId, amount, "0x");
      await erc1155Instance.connect(receiver).setApprovalForAll(await exchangeInstance.getAddress(), true);

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await exchangeInstance.getAddress());
      await accessInstance.renounceRole(MINTER_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).dismantle(
        params,
        [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        ],
        {
          tokenType: 4,
          token: await erc1155Instance.getAddress(),
          tokenId,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: EnforcedPause", async function () {
      const [_owner] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", exchangeInstance);
      await pausableInstance.pause();

      const tx1 = exchangeInstance.dismantle(
        params,
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId,
          amount,
        },
        ZeroHash,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
