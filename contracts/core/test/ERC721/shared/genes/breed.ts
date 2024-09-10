import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { templateId, tokenAttributes, motherGenes, fatherGenes } from "../../../constants";
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

    it("breed should mix genes to generate attribute fields", async function () {
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

      // Simulate Chainlink VRF response
      await randomRequest(erc721Instance, vrfInstance, 54321n);

      const newTokenId = await erc721Instance.totalSupply();

      expect(newTokenId).to.be.equal(3);
      
      const newTokenOwner = await erc721Instance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver.address);

      const newGenes = await erc721Instance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);

      const decodedGenes = await erc721Instance.decodeNumber(newGenes);

      expect(decodedGenes.baseColor).to.be.equal(14166n);
      expect(decodedGenes.highlightColor).to.be.equal(43892n);
      expect(decodedGenes.accentColor).to.be.equal(33047n);
      expect(decodedGenes.mouth).to.be.equal(57073n);
      expect(decodedGenes.fur).to.be.equal(21540n);
      expect(decodedGenes.pattern).to.be.equal(749n);
      expect(decodedGenes.eyeShape).to.be.equal(33824n);
      expect(decodedGenes.eyeColor).to.be.equal(36321n);
      expect(decodedGenes.wild).to.be.equal(3631n);
      expect(decodedGenes.environment).to.be.equal(4522n);
      expect(decodedGenes.secret).to.be.equal(64664n);
      expect(decodedGenes.purrstige).to.be.equal(33661n);
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
