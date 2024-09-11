import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { concat, Contract, encodeBytes32String, toBeHex, ZeroAddress, ZeroHash, zeroPadValue } from "ethers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";
import { decodeNumber, decodeTraits } from "@gemunion/traits-v6";

import { expiresAt, externalId, extra, params, tokenId } from "../constants";
import { TokenMetadata } from "../types";
import { VRFCoordinatorV2PlusMock } from "../../typechain-types";
import { deployDiamond, deployErc721Base, wrapOneToOneSignature } from "./shared";
import { isEqualEventArgObj } from "../utils";
import { deployLinkVrfFixture } from "../shared/link";
import { randomRequest } from "../shared/randomRequest";
import { decodeMetadata } from "../shared/metadata";
import { recursivelyDecodeResult } from "../../utis/decoder";

describe("Diamond Exchange Breed", function () {
  const factory = async (facetName = "ExchangeBreedFacet"): Promise<any> => {
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
    return wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
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

  describe("breed", function () {
    describe("ERC721Genes", function () {
      it("should breed", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

        // Set VRFV2 Subscription
        const tx01 = erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        const genesis0 = {
          templateId: 128,
          matronId: 0,
          sireId: 1,
        };
        const encodedExternalId0 = concat([
          zeroPadValue(toBeHex(genesis0.sireId), 3),
          zeroPadValue(toBeHex(genesis0.matronId), 4),
          zeroPadValue(toBeHex(genesis0.templateId), 4),
        ]);
        await erc721Instance.mintRandom(receiver.address, encodedExternalId0);
        const genesis1 = {
          templateId: 128,
          matronId: 1,
          sireId: 0,
        };
        const encodedExternalId1 = concat([
          zeroPadValue(toBeHex(genesis1.sireId), 3),
          zeroPadValue(toBeHex(genesis1.matronId), 4),
          zeroPadValue(toBeHex(genesis1.templateId), 4),
        ]);
        await erc721Instance.mintRandom(receiver.address, encodedExternalId1);

        await randomRequest(erc721Instance, vrfInstance);

        const balance1 = await erc721Instance.balanceOf(receiver.address);
        expect(balance1).to.equal(2);

        const genesis = {
          templateId: 128,
          matronId: 256,
          sireId: 1024,
        };
        const encodedExternalId = concat([
          zeroPadValue(toBeHex(genesis.sireId), 3),
          zeroPadValue(toBeHex(genesis.matronId), 4),
          zeroPadValue(toBeHex(genesis.templateId), 4),
        ]);
        // const encodedExternalId = BigNumber.from("0x0004000000010000000080");
        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId: encodedExternalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });
        const tx1 = exchangeInstance.connect(receiver).breed(
          {
            nonce: encodeBytes32String("nonce"),
            externalId: encodedExternalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Breed")
          .withArgs(
            receiver.address,
            encodedExternalId,
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 1n,
              amount: 1n,
            }),
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 2n,
              amount: 1n,
            }),
          );

        // RANDOM
        await randomRequest(erc721Instance, vrfInstance);
        const balance2 = await erc721Instance.balanceOf(receiver.address);
        expect(balance2).to.equal(3);

        // TEST METADATA
        const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(3));
        const decodedMeta = decodeMetadata(metadata as any[]);
        expect(decodedMeta[TokenMetadata.TEMPLATE_ID]).to.equal(genesis.templateId.toString());

        const genes = decodedMeta[TokenMetadata.GENES];
        const decodedParents = decodeTraits(BigInt(genes), ["matronId", "sireId"].reverse());
        expect(decodedParents.matronId).to.equal(genesis.matronId);
        expect(decodedParents.sireId).to.equal(genesis.sireId);
        const random = decodeNumber(BigInt(genes)).slice(0, 6);
        expect(random.join("").length).to.be.greaterThan(50); // todo better check ????
      });

      it("should fail: GenesPregnancyCountLimitExceed", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

        // Set VRFV2 Subscription
        const tx01 = erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintCommon(receiver.address, 1);
        await erc721Instance.mintCommon(receiver.address, 2);

        const balance1 = await erc721Instance.balanceOf(receiver.address);
        expect(balance1).to.equal(2);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });
        const tx1 = exchangeInstance.connect(receiver).breed(
          params,
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Breed")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 1n,
              amount: 1n,
            }),
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 2n,
              amount: 1n,
            }),
          );

        // RANDOM
        await randomRequest(erc721Instance, vrfInstance);
        const balance2 = await erc721Instance.balanceOf(receiver.address);
        expect(balance2).to.equal(3);

        await exchangeInstance.setPregnancyLimits(1, 10000, 60 * 2 ** 13);

        const signature1 = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce1"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1n,
            amount: 1n,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2n,
            amount: 1n,
          },
        });
        const tx2 = exchangeInstance.connect(receiver).breed(
          {
            nonce: encodeBytes32String("nonce1"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature1,
        );
        await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "GenesPregnancyCountLimitExceed");

        await erc721Instance.mintCommon(receiver.address, 4);
        const signature2 = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce2"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 4,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });
        const tx3 = exchangeInstance.connect(receiver).breed(
          {
            nonce: encodeBytes32String("nonce2"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 4,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature2,
        );
        await expect(tx3).to.be.revertedWithCustomError(exchangeInstance, "GenesPregnancyCountLimitExceed");
      });

      it("should fail: GenesPregnancyTimeLimitExceed", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

        // Set VRFV2 Subscription
        const tx01 = erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintCommon(receiver.address, 1);
        await erc721Instance.mintCommon(receiver.address, 2);

        const balance1 = await erc721Instance.balanceOf(receiver.address);
        expect(balance1).to.equal(2);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });
        const tx1 = exchangeInstance.connect(receiver).breed(
          params,
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );
        await expect(tx1)
          .to.emit(exchangeInstance, "Breed")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 1n,
              amount: 1n,
            }),
            isEqualEventArgObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId: 2n,
              amount: 1n,
            }),
          );

        // RANDOM
        await randomRequest(erc721Instance, vrfInstance);
        const balance2 = await erc721Instance.balanceOf(receiver.address);
        expect(balance2).to.equal(3);

        await exchangeInstance.setPregnancyLimits(10, 10000, 60 * 2 ** 13);

        const signature1 = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce1"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });
        const tx2 = exchangeInstance.connect(receiver).breed(
          {
            nonce: encodeBytes32String("nonce1"),
            externalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature1,
        );
        await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "GenesPregnancyTimeLimitExceed");
      });

      it("should fail: GenesNotOwnerNorApproved", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);
        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintCommon(owner.address, 1);
        await erc721Instance.mintCommon(receiver.address, 2);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });

        const tx1 = exchangeInstance.connect(receiver).breed(
          params,
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "GenesNotOwnerNorApproved");
      });

      it("should fail: Invalid signature", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

        const signature = await generateSignature({
          account: owner.address, // should be receiver.address
          params,
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });

        const tx1 = exchangeInstance.connect(receiver).breed(
          params,
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        // ECDSA always returns an address
        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
      });

      it("should fail: Wrong signer", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

        const signature = await generateSignature({
          account: owner.address,
          params,
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });

        const tx1 = exchangeInstance.connect(receiver).breed(
          params,
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
      });

      it("should fail: signer missing role", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

        // Set VRFV2 Subscription
        const tx01 = erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        const genesis0 = {
          templateId: 128,
          matronId: 0,
          sireId: 1,
        };
        const encodedExternalId0 = concat([
          zeroPadValue(toBeHex(genesis0.sireId), 3),
          zeroPadValue(toBeHex(genesis0.matronId), 4),
          zeroPadValue(toBeHex(genesis0.templateId), 4),
        ]);
        await erc721Instance.mintRandom(receiver.address, encodedExternalId0);
        const genesis1 = {
          templateId: 128,
          matronId: 1,
          sireId: 0,
        };
        const encodedExternalId1 = concat([
          zeroPadValue(toBeHex(genesis1.sireId), 3),
          zeroPadValue(toBeHex(genesis1.matronId), 4),
          zeroPadValue(toBeHex(genesis1.templateId), 4),
        ]);
        await erc721Instance.mintRandom(receiver.address, encodedExternalId1);

        await randomRequest(erc721Instance, vrfInstance);

        const balance1 = await erc721Instance.balanceOf(receiver.address);
        expect(balance1).to.equal(2);

        const genesis = {
          templateId: 128,
          matronId: 256,
          sireId: 1024,
        };
        const encodedExternalId = concat([
          zeroPadValue(toBeHex(genesis.sireId), 3),
          zeroPadValue(toBeHex(genesis.matronId), 4),
          zeroPadValue(toBeHex(genesis.templateId), 4),
        ]);
        // const encodedExternalId = BigNumber.from("0x0004000000010000000080");
        const signature = await generateSignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId: encodedExternalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          item: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 1,
            amount: 1,
          },
          price: {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId: 2,
            amount: 1,
          },
        });

        const accessInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);
        await accessInstance.renounceRole(MINTER_ROLE, owner.address);

        const tx1 = exchangeInstance.connect(receiver).breed(
          {
            nonce: encodeBytes32String("nonce"),
            externalId: encodedExternalId,
            expiresAt,
            receiver: ZeroAddress,
            referrer: ZeroAddress,
            extra,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 1,
            amount: 1,
          },
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId: 2,
            amount: 1,
          },
          signature,
        );

        await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
      });

      // TODO add tests for Breed.sol
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const [_owner] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", exchangeInstance);
      await pausableInstance.pause();

      const tx1 = exchangeInstance.breed(
        params,
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
        ZeroHash,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
