import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { makeTimestamps, Position, Outcome, fundAndBet, getAssetBalance, treasuryFee } from "./utils";

export function shouldClaim(predictionFactory, betAssetFactory, isVerbose = false) {
  describe("claim", function () {
    it("should distribute rewards in LEFT outcome", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const balanceBeforeClaim = await getAssetBalance(betAsset, bettor1);
      await predictionInstance.connect(bettor1).claim(1);
      const balanceAfterClaim = await getAssetBalance(betAsset, bettor1);

      // Bettor2 should not be able to claim
      await expect(predictionInstance.connect(bettor2).claim(1)).to.be.revertedWithCustomError(
        predictionInstance,
        "NotEligibleForClaim",
      );

      expect(balanceAfterClaim - balanceBeforeClaim).to.be.closeTo(
        betAsset.amount + betAsset.amount - (betAsset.amount * treasuryFee) / 10000n,
        ethers.parseUnits("1", 14),
      );

      if (isVerbose) {
        console.log("Rewards distributed correctly for LEFT outcome.");
      }
    });

    it("should distribute rewards in RIGHT outcome", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.RIGHT);

      // Bettor2 claims reward
      const balanceBeforeClaim = await getAssetBalance(betAsset, bettor2);
      await predictionInstance.connect(bettor2).claim(1);
      const balanceAfterClaim = await getAssetBalance(betAsset, bettor2);

      // Bettor1 should not be able to claim
      await expect(predictionInstance.connect(bettor1).claim(1)).to.be.revertedWithCustomError(
        predictionInstance,
        "NotEligibleForClaim",
      );

      // Check reward distribution
      expect(balanceAfterClaim - balanceBeforeClaim).to.be.closeTo(
        betAsset.amount + betAsset.amount - (betAsset.amount * treasuryFee) / 10000n,
        ethers.parseUnits("1", 14),
      );

      if (isVerbose) {
        console.log("Rewards distributed correctly for RIGHT outcome.");
      }
    });

    it("should refund stakes in DRAW outcome", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.DRAW);

      // Bettor1 claims refund
      const balanceBeforeClaim1 = await getAssetBalance(betAsset, bettor1);
      await predictionInstance.connect(bettor1).claim(1);
      const balanceAfterClaim1 = await getAssetBalance(betAsset, bettor1);

      // Bettor2 claims refund
      const balanceBeforeClaim2 = await getAssetBalance(betAsset, bettor2);
      await predictionInstance.connect(bettor2).claim(1);
      const balanceAfterClaim2 = await getAssetBalance(betAsset, bettor2);

      // Check refund distribution
      expect(balanceAfterClaim1).to.be.closeTo(balanceBeforeClaim1 + betAsset.amount, ethers.parseUnits("1", 14));
      expect(balanceAfterClaim2).to.be.closeTo(balanceBeforeClaim2 + betAsset.amount, ethers.parseUnits("1", 14));

      if (isVerbose) {
        console.log("Stakes refunded correctly for DRAW outcome.");
      }
    });

    it("should revert if tried to claim by non-winner side", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor2 tries to claim
      await expect(predictionInstance.connect(bettor2).claim(1)).to.be.revertedWithCustomError(
        predictionInstance,
        "NotEligibleForClaim",
      );

      if (isVerbose) {
        console.log("Claim by non-winner side reverted as expected.");
      }
    });

    it("should revert if tried to claim before prediction is resolved", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.connect(admin).startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      // Bettor1 tries to claim before resolution
      await expect(predictionInstance.connect(bettor1).claim(1)).to.be.revertedWithCustomError(
        predictionInstance,
        "CannotClaimBeforeResolution",
      );

      if (isVerbose) {
        console.log("Claim before resolution reverted as expected.");
      }
    });

    it("should revert if tried to claim multiple times", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      await predictionInstance.connect(bettor1).claim(1);

      // Bettor1 tries to claim again
      await expect(predictionInstance.connect(bettor1).claim(1)).to.be.revertedWithCustomError(
        predictionInstance,
        "RewardAlreadyClaimed",
      );

      if (isVerbose) {
        console.log("Multiple claims reverted as expected.");
      }
    });

    it("should distribute rewards correctly when multiple bettors on both sides", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2, bettor3, bettor4] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      await fundAndBet(predictionInstance, bettor3, {
        predictionId: 1,
        multiplier: 2,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor4, {
        predictionId: 1,
        multiplier: 4,
        position: Position.RIGHT,
      });

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const initialBalance1 = await getAssetBalance(betAsset, bettor1);
      await predictionInstance.connect(bettor1).claim(1);
      const finalBalance1 = await getAssetBalance(betAsset, bettor1);

      // Bettor3 claims reward
      const initialBalance3 = await getAssetBalance(betAsset, bettor3);
      await predictionInstance.connect(bettor3).claim(1);
      const finalBalance3 = await getAssetBalance(betAsset, bettor3);

      // Check reward distribution
      const totalLeftUnits = 1n + 2n;
      const totalRightAmount = 1n * betAsset.amount + 4n * betAsset.amount;
      const treasuryAmt = (totalRightAmount * treasuryFee) / 10000n;
      const rewardAmount = totalRightAmount - treasuryAmt;

      const expectedReward1 = 1n * betAsset.amount + (1n * rewardAmount) / totalLeftUnits;
      const expectedReward3 = 2n * betAsset.amount + (2n * rewardAmount) / totalLeftUnits;

      expect(finalBalance1).to.be.closeTo(initialBalance1 + expectedReward1, ethers.parseUnits("1", 14));
      expect(finalBalance3).to.be.closeTo(initialBalance3 + expectedReward3, ethers.parseUnits("1", 14));

      if (isVerbose) {
        console.log("Rewards distributed correctly for multiple bettors on both sides.");
      }
    });

    it("should refund bets when tried to claim unresolved prediction after expiry time", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1, bettor2] = await ethers.getSigners();
      const { endTimestamp, startTimestamp, expiryTimestamp } = await makeTimestamps();

      await predictionInstance.connect(admin).startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(predictionInstance, bettor2, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      });

      // Move time forward to after the expiry timestamp
      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      // Bettor1 claims refund
      const initialBalance1 = await getAssetBalance(betAsset, bettor1);
      await predictionInstance.connect(bettor1).claim(1);
      const finalBalance1 = await getAssetBalance(betAsset, bettor1);

      // Bettor2 claims refund
      const initialBalance2 = await getAssetBalance(betAsset, bettor2);
      await predictionInstance.connect(bettor2).claim(1);
      const finalBalance2 = await getAssetBalance(betAsset, bettor2);

      // Check refund distribution
      expect(finalBalance1).to.be.closeTo(initialBalance1 + betAsset.amount, ethers.parseUnits("1", 14));
      expect(finalBalance2).to.be.closeTo(initialBalance2 + betAsset.amount, ethers.parseUnits("1", 14));

      if (isVerbose) {
        console.log("Bets refunded correctly for unresolved prediction after expiry time.");
      }
    });
  });
}
