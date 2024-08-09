import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, encodeBytes32String, toBeHex, ZeroAddress, ZeroHash, zeroPadValue } from "ethers";

import { amount, MINTER_ROLE, nonce } from "@gemunion/contracts-constants";

import { VRFCoordinatorV2PlusMock } from "../../typechain-types";
import { expiresAt, externalId, extra, params, templateId, tokenId } from "../constants";
import {
  deployDiamond,
  deployErc1155Base,
  deployErc20Base,
  deployErc721Base,
  deployErc998Base,
  wrapManyToManySignature,
} from "./shared";
import { isEqualEventArgArrObj } from "../utils";
import { deployLinkVrfFixture } from "../shared/link";
import { randomRequest } from "../shared/randomRequest";
import { deployCollection } from "../Mechanics/Collection/shared/fixtures";

describe("Diamond Exchange Claim", function () {
  const factory = async (facetName = "ExchangeClaimFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, diamondInstance);
  };

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    return wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);
  };

  let vrfInstance: VRFCoordinatorV2PlusMock;
  let subId: bigint;

  before(async function () {
    await network.provider.send("hardhat_reset");

    // https://github.com/NomicFoundation/hardhat/issues/2980
    ({ vrfInstance, subId } = await loadFixture(function exchange() {
      return deployLinkVrfFixture();
    }));
  });

  after(async function () {
    await network.provider.send("hardhat_reset");
  });

  describe("claim", function () {
    describe("ERC721", function () {
      it("should claim (Simple)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721Instance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);

        const balance = await erc721Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });

      it("should claim (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

        const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        // Set VRFV2 Subscription
        const tx01 = erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.not.emit(erc721Instance, "Transfer");

        await randomRequest(erc721Instance, vrfInstance);

        const balance = await erc721Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC998", function () {
      it("should claim (Simple)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc998Instance = await deployErc998Base("ERC998Simple", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc998Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc998Instance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);

        const balance = await erc998Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });

      it("should claim (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);
        const erc998Instance = await deployErc998Base("ERC998RandomHardhat", exchangeInstance);

        const tx02 = await vrfInstance.addConsumer(subId, erc998Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc998Instance);

        // Set VRFV2 Subscription
        const tx01 = erc998Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc998Instance, "VrfSubscriptionSet").withArgs(subId);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc998Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.not.emit(erc998Instance, "Transfer");

        await randomRequest(erc998Instance, vrfInstance);

        const balance = await erc998Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC1155", function () {
      it("should claim", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 4,
              token: erc1155Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(exchangeInstance, ZeroAddress, receiver.address, tokenId, amount);

        const balance = await erc1155Instance.balanceOf(receiver.address, tokenId);
        expect(balance).to.equal(amount);
      });
    });

    describe("ERROR", function () {
      it("should fail: Expired signature 1", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce,
            externalId,
            expiresAt: 1,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          {
            nonce,
            externalId,
            expiresAt: 1,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
      });

      it("should fail: Expired signature 2", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const extra = zeroPadValue(toBeHex(Math.ceil(new Date("2000-01-01T00:00:00.000Z").getTime() / 1000)), 32);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce,
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          {
            nonce,
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
      });

      it("should fail: SignerMissingRole", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        const signature = await generateSignature({
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
          price: [],
        });

        const accessInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);
        await accessInstance.renounceRole(MINTER_ROLE, owner.address);

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
      });

      it("should fail: EnforcedPause", async function () {
        const diamondInstance = await factory();

        const exchangeInstance = await ethers.getContractAt("ExchangeClaimFacet", diamondInstance);
        const pausableInstance = await ethers.getContractAt("PausableFacet", diamondInstance);
        await pausableInstance.pause();

        const tx1 = exchangeInstance.claim(
          params,
          [
            {
              tokenType: 1,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          ZeroHash,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
      });
    });
  });

  describe("spend", function () {
    describe("ERC20", function () {
      it("should spend", async function () {
        const [owner, receiver] = await ethers.getSigners();

        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address, // spender
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
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address, // spender
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 1n,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner.address, receiver.address, amount);

        await expect(tx1).changeTokenBalances(erc20Instance, [owner, receiver], [-amount, amount]);

        const balance = await erc20Instance.balanceOf(receiver.address);
        expect(balance).to.equal(amount);
      });

      it("should spend (extra)", async function () {
        const [owner, receiver] = await ethers.getSigners();

        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const extra = zeroPadValue(toBeHex(Math.ceil(new Date("2030-01-01T00:00:00.000Z").getTime() / 1000)), 32);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce,
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
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          {
            nonce,
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 1n,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner.address, receiver.address, amount);

        await expect(tx1).changeTokenBalances(erc20Instance, [owner, receiver], [-amount, amount]);

        const balance = await erc20Instance.balanceOf(receiver.address);
        expect(balance).to.equal(amount);
      });
    });

    describe("ERC721", function () {
      it("should spend (Simple)", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

        // MINT
        const tx0 = erc721Instance.mintCommon(owner.address, templateId);
        await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);
        // APPROVE
        await erc721Instance.approve(exchangeInstance, tokenId);

        const params = {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: owner.address, // initial owner of token
          referrer: ZeroAddress,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721Instance, "Transfer")
          .withArgs(owner.address, receiver.address, tokenId);

        const balance = await erc721Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });

      it("should spend (Collection)", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        // DEPLOY ERC721 Collection
        const batchSize = 10n;
        const erc721CollectionInstance = await deployCollection("ERC721CBlacklist", batchSize);
        // TEST deploy?

        // APPROVE
        const tx01 = erc721CollectionInstance.setApprovalForAll(exchangeInstance, true);
        await expect(tx01)
          .to.emit(erc721CollectionInstance, "ApprovalForAll")
          .withArgs(owner.address, exchangeInstance, true);

        const params = {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: owner.address, // initial owner of token
          referrer: ZeroAddress,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721CollectionInstance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 2,
              token: erc721CollectionInstance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721CollectionInstance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721CollectionInstance, "Transfer")
          .withArgs(owner.address, receiver.address, tokenId);

        const balance = await erc721CollectionInstance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC998", function () {
      it("should spend (Simple)", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc998Instance = await deployErc998Base("ERC998Simple", exchangeInstance);

        // MINT
        const tx0 = erc998Instance.mintCommon(owner.address, templateId);
        await expect(tx0).to.emit(erc998Instance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);
        // APPROVE
        await erc998Instance.approve(exchangeInstance, tokenId);

        const params = {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: owner.address, // initial owner of token
          referrer: ZeroAddress,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 2,
              token: erc998Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc998Instance, "Transfer")
          .withArgs(owner.address, receiver.address, tokenId);

        const balance = await erc998Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC1155", function () {
      it("should spend", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        // MINT
        const tx0 = erc1155Instance.mint(owner.address, templateId, amount, "0x");
        await expect(tx0)
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(owner.address, ZeroAddress, owner.address, tokenId, amount);
        // APPROVE
        await erc1155Instance.setApprovalForAll(exchangeInstance, true);
        const isApproved = await erc1155Instance.isApprovedForAll(owner.address, exchangeInstance);
        expect(isApproved);

        const params = {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: owner.address, // initial owner of token
          referrer: ZeroAddress,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 4,
              token: erc1155Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 4n,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            }),
          )
          .to.emit(erc1155Instance, "TransferSingle")
          .withArgs(exchangeInstance, owner.address, receiver.address, tokenId, amount);

        const balance = await erc1155Instance.balanceOf(receiver.address, tokenId);
        expect(balance).to.equal(amount);
      });
    });

    describe("ERROR", function () {
      it("should fail: Expired signature 1", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce,
            externalId,
            expiresAt: 1,
            receiver: ZeroAddress,
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
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          {
            nonce,
            externalId,
            expiresAt: 1,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
      });

      it("should fail: Expired signature 2", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address, // spender
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
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address, // spender
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1).to.emit(exchangeInstance, "Claim");

        const tx2 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
      });

      it("should fail: Expired signature 3", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const extra = zeroPadValue(toBeHex(Math.ceil(new Date("2000-01-01T00:00:00.000Z").getTime() / 1000)), 32);

        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce,
            externalId,
            expiresAt,
            receiver: ZeroAddress,
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
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          {
            nonce,
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
      });

      it("should fail: SignerMissingRole", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(exchangeInstance, amount);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          price: [],
        });

        const accessInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);
        await accessInstance.renounceRole(MINTER_ROLE, owner.address);

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
          ],
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
      });

      it("should fail: EnforcedPause", async function () {
        const diamondInstance = await factory();

        const exchangeInstance = await ethers.getContractAt("ExchangeClaimFacet", diamondInstance);
        const pausableInstance = await ethers.getContractAt("PausableFacet", diamondInstance);
        await pausableInstance.pause();

        const tx1 = exchangeInstance.spend(
          params,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          ZeroHash,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
      });
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const diamondInstance = await factory();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeClaimFacet", diamondAddress);
      const pausableInstance = await ethers.getContractAt("PausableFacet", diamondAddress);
      await pausableInstance.pause();

      const generateSignature = await getSignatures(diamondInstance);

      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(exchangeInstance, amount);

      const extra = zeroPadValue(toBeHex(Math.ceil(new Date("2030-01-01T00:00:00.000Z").getTime() / 1000)), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce,
          externalId,
          expiresAt,
          receiver: ZeroAddress,
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
        price: [],
      });

      const tx1 = exchangeInstance.connect(receiver).claim(
        {
          nonce,
          externalId,
          expiresAt,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
          extra,
        },
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
