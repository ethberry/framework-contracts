import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { templateId, tokenAttributes, tokenId } from "../../../constants";
import { randomRequest } from "../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../shared/link";

export function shouldBreed(factory: () => Promise<any>) {
  describe("breed", function () {
    it("should breed successfully", async function () {
      const { vrfInstance, subId } = await loadFixture(deployLinkVrfFixture);
      const [_owner, receiver] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      // Set VRFV2 Subscription
      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

      // Add Consumer to VRFV2
      const tx02 = await vrfInstance.addConsumer(subId, contractInstance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);

      // Mint two tokens for breeding
      await contractInstance.mintGenes(receiver.address, templateId, genes);
      await contractInstance.mintGenes(receiver.address, templateId, genes);

      // Breed the two tokens
      await contractInstance.connect(receiver).breed(1, 2);

      // Simulate Chainlink VRF response
      await randomRequest(contractInstance, vrfInstance, 54321n);

      // Verify the new token's owner and genes
      const newTokenId = await contractInstance.totalSupply();
      const newTokenOwner = await contractInstance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver.address);

      const newGenes = await contractInstance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);
      expect(newGenes).to.equal(genes);
    });

    it("should revert if sender is not owner nor approved", async function () {
      const { vrfInstance, subId } = await loadFixture(deployLinkVrfFixture);
      const [owner, receiver, other] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      // Set VRFV2 Subscription
      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

      // Add Consumer to VRFV2
      const tx02 = await vrfInstance.addConsumer(subId, contractInstance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);

      // Mint two tokens for breeding
      await contractInstance.mintGenes(receiver.address, templateId, genes);
      await contractInstance.mintGenes(receiver.address, templateId, genes);

      // Attempt to breed by a non-owner and non-approved address
      await expect(contractInstance.connect(other).breed(1, 2)).to.be.revertedWithCustomError(
        contractInstance,
        "NotOwnerNorApproved",
      );
    });
  });
}
