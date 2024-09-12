import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { templateId, tokenAttributes, genesTokenAttributes, motherGenes, fatherGenes } from "../../../constants";
import { randomRequest } from "../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../shared/link";

export function shouldBreed(factory: () => Promise<any>) {
  describe("breed", function () {
    let vrfInstance: VRFCoordinatorV2PlusMock;
    let subId: bigint;

    before(async function () {
      await network.provider.send("hardhat_reset");

      ({ vrfInstance, subId } = await loadFixture(function exchange() {
        return deployLinkVrfFixture();
      }));
    });

    after(async function () {
      await network.provider.send("hardhat_reset");
    });

    it.only("breed should mix genes to generate attribute fields", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const erc721Instance = await factory();

      const tx01 = await erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      // Mint two tokens for breeding
      await erc721Instance.mintGenes(receiver.address, templateId, motherGenes);
      await erc721Instance.mintGenes(receiver.address, templateId, fatherGenes);

      // Breed the two tokens
      await erc721Instance.connect(receiver).breed(1, 2);

      // Wait for MintGenes event
      const filter = erc721Instance.filters.MintGenes();
      const mintGenesEvent = await erc721Instance.queryFilter(filter);
      if (process.env.VERBOSE === "true") {
         console.log('mintGenesEvent', mintGenesEvent) 
      }

      // Simulate Chainlink VRF response
      await randomRequest(erc721Instance, vrfInstance, 54321n);

      const newTokenId = await erc721Instance.totalSupply();

      expect(newTokenId).to.be.equal(3n);
      
      const newTokenOwner = await erc721Instance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver.address);

      const newGenes = await erc721Instance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);

      const decodedGenes = await erc721Instance.decodeNumber(newGenes);
      if (process.env.VERBOSE === "true") {
        console.log('decodedGenes', decodedGenes)
      }

      expect(decodedGenes.baseColor).to.be.equal(9n);
      expect(decodedGenes.highlightColor).to.be.equal(9n);
      expect(decodedGenes.accentColor).to.be.equal(5n);
      expect(decodedGenes.mouth).to.be.equal(2n);
      expect(decodedGenes.fur).to.be.equal(9n);
      expect(decodedGenes.pattern).to.be.equal(10n);
      expect(decodedGenes.eyeShape).to.be.equal(1n);
      expect(decodedGenes.eyeColor).to.be.equal(10n);
      expect(decodedGenes.wild).to.be.equal(4n);
      expect(decodedGenes.environment).to.be.equal(5n);
      expect(decodedGenes.secret).to.be.equal(7n);
      expect(decodedGenes.purrstige).to.be.equal(8n);

      expect(await erc721Instance.getRecordFieldValue(newTokenId, genesTokenAttributes.MOTHER_ID), 1);

      // Check pregnancy attributes for mother
      const motherPregnancyCounter = await erc721Instance.getRecordFieldValue(1, genesTokenAttributes.PREGNANCY_COUNTER);
      const motherPregnancyTimestamp = await erc721Instance.getRecordFieldValue(1, genesTokenAttributes.PREGNANCY_TIMESTAMP);
      expect(motherPregnancyCounter).to.be.equal(1);
      expect(motherPregnancyTimestamp).to.be.closeTo(Math.floor(Date.now() / 1000), 50);

      // Check pregnancy attributes for father
      const fatherPregnancyCounter = await erc721Instance.getRecordFieldValue(2, genesTokenAttributes.PREGNANCY_COUNTER);
      const fatherPregnancyTimestamp = await erc721Instance.getRecordFieldValue(2, genesTokenAttributes.PREGNANCY_TIMESTAMP);
      expect(fatherPregnancyCounter).to.be.equal(1);
      expect(fatherPregnancyTimestamp).to.be.closeTo(Math.floor(Date.now() / 1000), 50);
    });

    it("should fail: NotOwnerNorApproved", async function () {
      const [_owner, receiver, stranger] = await ethers.getSigners();

      const erc721Instance = await factory();

      const tx01 = await erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      await erc721Instance.mintGenes(receiver.address, templateId, motherGenes);
      await erc721Instance.mintGenes(stranger.address, templateId, fatherGenes);

      // Attempt to breed tokens owned by different addresses
      await expect(erc721Instance.connect(receiver).breed(1, 2)).to.be.revertedWithCustomError(
        erc721Instance,
        "NotOwnerNorApproved",
      );
    });

    it("should revert if one of the tokens does not exist", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const erc721Instance = await factory();

      const tx01 = await erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      await erc721Instance.mintGenes(receiver.address, templateId, motherGenes);

      // Attempt to breed with a non-existent token
      await expect(erc721Instance.connect(receiver).breed(1, 999)).to.be.revertedWithCustomError(
        erc721Instance,
        "ERC721NonexistentToken",
      );
    });
  });
}
