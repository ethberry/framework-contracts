import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { templateId, tokenAttributes, tokenId } from "../../../constants";
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
    
    it("should breed successfully", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, contractInstance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);

      // Mint two tokens for breeding
      await contractInstance.mintGenes(receiver.address, templateId, genes);
      await contractInstance.mintGenes(receiver.address, templateId, genes);

      // Breed the two tokens
      await contractInstance.connect(receiver).breed(1, 2);

      // Simulate Chainlink VRF response
      await randomRequest(contractInstance, vrfInstance, 54321n);

      const newTokenId = await contractInstance.totalSupply();
      const newTokenOwner = await contractInstance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver.address);

      const newGenes = await contractInstance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);
      expect(newGenes).to.equal(genes);
    });

    it("should revert if sender is not owner nor approved", async function () {
      const [owner, receiver, other] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

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

    it("should revert if tokens are not owned by the same address", async function () {
      const { vrfInstance, subId } = await loadFixture(deployLinkVrfFixture);
      const [owner, receiver, other] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, contractInstance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);

      // Mint two tokens for breeding
      await contractInstance.mintGenes(receiver.address, templateId, genes);
      await contractInstance.mintGenes(other.address, templateId, genes);

      // Attempt to breed tokens owned by different addresses
      await expect(contractInstance.connect(receiver).breed(1, 2)).to.be.revertedWithCustomError(
        contractInstance,
        "NotOwnerNorApproved",
      );
    });

    it("should revert if one of the tokens does not exist", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const genes = 12345;

      const contractInstance = await factory();

      const tx01 = await contractInstance.setSubscriptionId(subId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = await vrfInstance.addConsumer(subId, contractInstance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);

      // Mint one token for breeding
      await contractInstance.mintGenes(receiver.address, templateId, genes);

      // Attempt to breed with a non-existent token
      await expect(contractInstance.connect(receiver).breed(1, 999)).to.be.revertedWith("ERC721: owner query for nonexistent token");
    });
  });
}
