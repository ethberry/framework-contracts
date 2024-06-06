import { expect } from "chai";
import { ethers } from "hardhat";

import { deployVRFCoordinator } from "./fixtures";
import { amount } from "@gemunion/contracts-constants";

describe("GemVRFCoordinator", function () {
  const factory = deployVRFCoordinator;

  describe("Subscription", function () {
    it("should fund subscription", async function () {
      const { vrfInstance, erc20Instance } = await factory();
      const [owner, stranger] = await ethers.getSigners();

      // TetherToken doesn't have mint function
      await erc20Instance.mint(owner, amount);

      const tx1 = await vrfInstance.connect(stranger).createSubscription();

      await expect(tx1).to.emit(vrfInstance, "SubscriptionCreated").withArgs(1, stranger.address);

      await erc20Instance.approve(await vrfInstance.getAddress(), amount);

      const tx2 = vrfInstance.topUp(1, amount);
      await expect(tx2).to.be.emit(vrfInstance, "SubscriptionFunded").withArgs(1, 0, amount); // subId, oldBalance, oldBalance + amount
    });
  });
});
