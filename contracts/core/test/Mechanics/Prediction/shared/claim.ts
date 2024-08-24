import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { makeTimestamps, Position, Outcome, fundAndBet } from "./fixtures";

export function shouldClaim(factory: () => Promise<any>, isVerbose = false) {
  describe("claim", function () {
    it("should distribute rewards in LEFT outcome", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset, token } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const initialBalance1 = await token.balanceOf(bettor1);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1);

      // Bettor2 should not be able to claim
      await expect(prediction.connect(bettor2).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      // Check reward distribution
      const rewardAmount = finalBalance1 - initialBalance1;
      const expectedReward = betAsset.amount + betAsset.amount - (betAsset.amount * 1000n / 10000n);
      expect(finalBalance1).to.equal(initialBalance1 + expectedReward);

      expect(rewardAmount).to.equal(expectedReward);

      if (isVerbose) {
        console.log("Rewards distributed correctly for LEFT outcome.");
      }
    });

    it("should distribute rewards in RIGHT outcome", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset, token } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await prediction.connect(admin).resolvePrediction(1, Outcome.RIGHT);

      // Bettor2 claims reward
      const initialBalance2 = await token.balanceOf(bettor2);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2);

      // Bettor1 should not be able to claim
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      // Check reward distribution
      const rewardAmount = finalBalance2 - initialBalance2;
      const expectedReward = betAsset.amount + betAsset.amount - (betAsset.amount * 1000n / 10000n);

      expect(rewardAmount).to.equal(expectedReward);

      if (isVerbose) {
        console.log("Rewards distributed correctly for RIGHT outcome.");
      }
    });

    it("should refund stakes in DRAW outcome", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset, token } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await prediction.connect(admin).resolvePrediction(1, Outcome.DRAW);

      // Bettor1 claims refund
      const initialBalance1 = await token.balanceOf(bettor1);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1);

      // Bettor2 claims refund
      const initialBalance2 = await token.balanceOf(bettor2);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2);

      // Check refund distribution
      expect(finalBalance1).to.equal(initialBalance1 + betAsset.amount);
      expect(finalBalance2).to.equal(initialBalance2 + betAsset.amount);

      if (isVerbose) {
        console.log("Stakes refunded correctly for DRAW outcome.");
      }
    });

    it("should revert if tried to claim by non-winner side", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor2 tries to claim
      await expect(prediction.connect(bettor2).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      if (isVerbose) {
        console.log("Claim by non-winner side reverted as expected.");
      }
    });

    it("should revert if tried to claim before prediction is resolved", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      // Bettor1 tries to claim before resolution
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "CannotClaimBeforeResolution");

      if (isVerbose) {
        console.log("Claim before resolution reverted as expected.");
      }
    });

    it("should revert if tried to claim multiple times", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      await prediction.connect(bettor1).claim(1);

      // Bettor1 tries to claim again
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "RewardAlreadyClaimed");

      if (isVerbose) {
        console.log("Multiple claims reverted as expected.");
      }
    });

    it("should distribute rewards correctly when multiple bettors on both sides", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset, token } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      const bettor3 = (await ethers.getSigners())[4];
      const bettor4 = (await ethers.getSigners())[5];
      
      await token.mint(bettor3, betAsset.amount * 2n);
      await token.mint(bettor4, betAsset.amount * 4n);
      await token.connect(bettor3).approve(prediction, betAsset.amount * 2n);
      await token.connect(bettor4).approve(prediction, betAsset.amount * 4n);

      await prediction.connect(bettor3).placeBet(1, 2n, Position.LEFT);
      await prediction.connect(bettor4).placeBet(1, 4n, Position.RIGHT);

      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const initialBalance1 = await token.balanceOf(bettor1);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1);

      // Bettor3 claims reward
      const initialBalance3 = await token.balanceOf(bettor3.address);
      await prediction.connect(bettor3).claim(1);
      const finalBalance3 = await token.balanceOf(bettor3.address);

      // Check reward distribution
      const totalLeftUnits = 1n + 2n;
      const totalRightAmount = 1n * betAsset.amount + 4n * betAsset.amount;
      const treasuryAmt = totalRightAmount * 1000n / 10000n;
      const rewardAmount = totalRightAmount - treasuryAmt;

      const expectedReward1 = 1n * betAsset.amount + 1n * rewardAmount / totalLeftUnits;
      const expectedReward3 = 2n * betAsset.amount + 2n * rewardAmount / totalLeftUnits;

      expect(finalBalance1).to.equal(initialBalance1 + expectedReward1);
      expect(finalBalance3).to.equal(initialBalance3 + expectedReward3);

      if (isVerbose) {
        console.log("Rewards distributed correctly for multiple bettors on both sides.");
      }
    });

    it("should refund bets when tried to claim unresolved prediction after expiry time", async function () {
      const { prediction, bettor1, bettor2, admin, betAsset, token } = await factory();
      const { endTimestamp, startTimestamp, expiryTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      // Move time forward to after the expiry timestamp
      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      // Bettor1 claims refund
      const initialBalance1 = await token.balanceOf(bettor1);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1);

      // Bettor2 claims refund
      const initialBalance2 = await token.balanceOf(bettor2);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2);

      // Check refund distribution
      expect(finalBalance1).to.equal(initialBalance1 + betAsset.amount);
      expect(finalBalance2).to.equal(initialBalance2 + betAsset.amount);

      if (isVerbose) {
        console.log("Bets refunded correctly for unresolved prediction after expiry time.");
      }
    });
  });
}
