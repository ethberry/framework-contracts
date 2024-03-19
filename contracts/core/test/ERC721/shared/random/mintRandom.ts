import { expect } from "chai";
import { ethers, network } from "hardhat";
import { WeiPerEther } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { MINTER_ROLE } from "@gemunion/contracts-constants";

import { LinkToken, VRFCoordinatorV2Mock } from "../../../../typechain-types";
import { deployLinkVrfFixture } from "../../../shared/link";
import { subscriptionId, templateId, tokenAttributes, tokenId } from "../../../constants";
import { randomFixRequest } from "../../../shared/randomRequest";

export function shouldMintRandom(factory: () => Promise<any>) {
  describe("mintRandom", function () {
    let linkInstance: LinkToken;
    let vrfInstance: VRFCoordinatorV2Mock;

    before(async function () {
      await network.provider.send("hardhat_reset");

      // https://github.com/NomicFoundation/hardhat/issues/2980
      ({ linkInstance, vrfInstance } = await loadFixture(function shouldMintRandom() {
        return deployLinkVrfFixture();
      }));
    });

    it("should mintRandom", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      // Set VRFV2 Subscription
      const tx01 = contractInstance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(1);

      // Add Consumer to VRFV2
      const tx02 = vrfInstance.addConsumer(subscriptionId, await contractInstance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await contractInstance.getAddress());
      await contractInstance.mintRandom(receiver.address, templateId);

      if (network.name === "hardhat") {
        await randomFixRequest(contractInstance, vrfInstance);
      }

      const balance = await contractInstance.balanceOf(receiver.address);
      expect(balance).to.equal(1);

      const value1 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.TEMPLATE_ID);
      expect(value1).to.equal(templateId);

      const value2 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.RARITY);
      expect(value2).to.equal(2);
    });

    it("should fail: invalid subscription", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      // Set VRFV2 Subscription
      // const tx01 = contractInstance.setSubscriptionId(1);
      // await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(1);

      // Add Consumer to VRFV2
      const tx02 = vrfInstance.addConsumer(1, await contractInstance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(1, await contractInstance.getAddress());

      const tx03 = contractInstance.mintRandom(receiver.address, templateId);
      await expect(tx03).to.be.revertedWithCustomError(contractInstance, "InvalidSubscription");
    });

    it("should fail: set invalid subscription", async function () {
      const [_owner, _receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      // Set VRFV2 Subscription
      const tx01 = contractInstance.setSubscriptionId(0);
      await expect(tx01).to.be.revertedWithCustomError(contractInstance, "InvalidSubscription");
    });

    // TODO mintRandom to receiver
    // TODO mintRandom to nonReceiver

    it("should fail: wrong role", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.connect(receiver).mintRandom(receiver.address, templateId);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver.address, MINTER_ROLE);
    });

    it("should fail: TemplateZero", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await linkInstance.transfer(await contractInstance.getAddress(), WeiPerEther);

      const tx = contractInstance.mintRandom(receiver.address, 0);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "TemplateZero");
    });
  });
}

export function shouldMintRandomGenes(factory: () => Promise<any>) {
  describe("mintRandom (genes)", function () {
    let linkInstance: LinkToken;
    let vrfInstance: VRFCoordinatorV2Mock;

    before(async function () {
      await network.provider.send("hardhat_reset");

      // https://github.com/NomicFoundation/hardhat/issues/2980
      ({ linkInstance, vrfInstance } = await loadFixture(function shouldMintRandom() {
        return deployLinkVrfFixture();
      }));
    });

    it("should mintRandom", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      // Set VRFV2 Subscription
      const tx01 = contractInstance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(1);

      // Add Consumer to VRFV2
      const tx02 = vrfInstance.addConsumer(1, await contractInstance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(1, await contractInstance.getAddress());
      await contractInstance.mintRandom(receiver.address, templateId);

      if (network.name === "hardhat") {
        await randomFixRequest(contractInstance, vrfInstance);
      }

      const balance = await contractInstance.balanceOf(receiver.address);
      expect(balance).to.equal(1);

      const value1 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.TEMPLATE_ID);
      expect(value1).to.equal(templateId);

      const value2 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.GENES);
      expect(value2).to.equal(111655345488034401068468662163821541667918829552034862356118189303399389855744n);
    });

    // TODO mintRandom to receiver
    // TODO mintRandom to nonReceiver

    it("should fail: wrong role", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.connect(receiver).mintRandom(receiver.address, templateId);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver.address, MINTER_ROLE);
    });

    it("should fail: TemplateZero", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await linkInstance.transfer(await contractInstance.getAddress(), WeiPerEther);

      const tx = contractInstance.mintRandom(receiver.address, 0);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "TemplateZero");
    });
  });
}
