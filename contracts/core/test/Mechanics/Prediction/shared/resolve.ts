import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { makeTimestamps, Position, Outcome, fundAndBet } from "./utils";

export function shouldResolvePrediction(predictionFactory, betAssetFactory, isVerbose = false) {
  describe("resolve", function () {
    it("should not allow resolving by non-admin", async function () {
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

      await expect(
        predictionInstance.connect(bettor1).resolvePrediction(1, Outcome.LEFT),
      ).to.be.revertedWithCustomError(predictionInstance, "AccessControlUnauthorizedAccount");
    });

    it("should force prediction into expired state after expiry time", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin, bettor1] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.connect(admin).startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(predictionInstance, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      const resolveErrorTx = await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveErrorTx).to.emit(predictionInstance, "PredictionEnd").withArgs(1, Outcome.EXPIRED);

      if (isVerbose) {
        console.log("Bettor resolved the prediction as error after expiry time.");
      }
    });

    it("should force prediction into error state when there are no bettors on either side", async function () {
      const predictionInstance = await predictionFactory();
      const betAsset = await betAssetFactory();
      const [admin] = await ethers.getSigners();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await predictionInstance.connect(admin).startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      const resolveTx = await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveTx).to.emit(predictionInstance, "PredictionEnd").withArgs(1, Outcome.ERROR);

      const predictionMatch = await predictionInstance.getPrediction(1);

      expect(predictionMatch.rewardAsset.amount).to.equal(0);
      expect(predictionMatch.outcome).to.equal(Outcome.ERROR);
      expect(predictionMatch.resolved).to.equal(true);
    });

    it("should not allow resolving multiple times", async function () {
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

      await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);

      await expect(predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT)).to.be.revertedWithCustomError(
        predictionInstance,
        "PredictionAlreadyResolved",
      );

      if (isVerbose) {
        console.log("Admin tried to resolve multiple times but failed.");
      }
    });

    it("should allow admin to resolve prediction before endTimestamp and prevent further bets", async function () {
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

      const resolveTx = await predictionInstance.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveTx).to.emit(predictionInstance, "PredictionEnd").withArgs(1, Outcome.LEFT);

      await expect(
        fundAndBet(predictionInstance, bettor1, {
          predictionId: 1,
          multiplier: 1,
          position: Position.RIGHT,
        }),
      ).to.be.revertedWithCustomError(predictionInstance, "PredictionAlreadyResolved");

      if (isVerbose) {
        console.log("Admin resolved the prediction before endTimestamp and no more bets can be placed.");
      }
    });

    it("should revert if expired or error outcome is manually passed", async function () {
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

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      await expect(
        predictionInstance.connect(admin).resolvePrediction(1, Outcome.EXPIRED),
      ).to.be.revertedWithCustomError(predictionInstance, "InvalidOutcome");
      await expect(predictionInstance.connect(admin).resolvePrediction(1, Outcome.ERROR)).to.be.revertedWithCustomError(
        predictionInstance,
        "InvalidOutcome",
      );

      if (isVerbose) {
        console.log("Admin tried to resolve with an invalid outcome and failed.");
      }
    });
  });
}
