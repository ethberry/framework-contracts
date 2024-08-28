import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

import { makeTimestamps, Position, Outcome, fundAndBet } from "./utils";

export function shouldPreventReentrancy(predictionFactory: () => Promise<any>, betAssetFactory: () => Promise<any>) {
  describe("reentrancy", function () {
    it("should fail: ReentrancyGuard - prevent reentrancy attack on claim treasury", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [_owner, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      const ReentrantContractFactory = await ethers.getContractFactory("ReentrantBettor");
      const reentrantInstance = await ReentrantContractFactory.deploy(predictionInstance.target);

      const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
      await token.mint(reentrantInstance, betAsset.amount);

      await fundAndBet(reentrantInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.resolvePrediction(1, Outcome.RIGHT);

      // Attempt reentrant attack emitting event with success status false indicates it was prevented in claim method
      await expect(reentrantInstance.connect(bettor2).claim(1))
        .to.emit(reentrantInstance, "ReentrancyClaimAttempt")
        .withArgs(false);

      if (process.env.VERBOSE) {
        console.info("Reentrancy attack on claim function prevented as expected.");
      }
    });
  });
}
