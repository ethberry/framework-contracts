import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { makeTimestamps, Position, Outcome, fundAndBet } from "./fixtures";

export function shouldResolvePrediction(factory: () => Promise<any>, isVerbose = false) {
  describe("resolve", function () {
    //.AccessControlUnauthorizedAccount
    it("should not allow resolving by non-admin", async function () {
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

      await expect(prediction.connect(bettor1).resolvePrediction(1, Outcome.LEFT)).to.be.revertedWithCustomError(
        prediction,
        "AccessControlUnauthorizedAccount"
      );
    });

    //.PredictionEnd
    it("should force prediction into expired state after expiry time", async function () {
      const { prediction, admin, bettor1, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      const resolveErrorTx = await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveErrorTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, Outcome.EXPIRED);

      if (isVerbose) {
        console.log("Bettor resolved the prediction as error after expiry time.");
      }
    });

    //.PredictionEnd
    it("should force prediction into error state when there are no bettors on either side", async function () {
      const { prediction, admin, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      const resolveTx = await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, Outcome.ERROR);

      const predictionMatch = await prediction.getPrediction(1);

      expect(predictionMatch.rewardAsset.amount).to.equal(0);
      expect(predictionMatch.outcome).to.equal(Outcome.ERROR);
      expect(predictionMatch.resolved).to.equal(true);
    });

    //.PredictionAlreadyResolved
    it("should not allow resolving multiple times", async function () {
      const { prediction, admin, bettor1, bettor2, betAsset } = await factory();
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

      await expect(prediction.connect(admin).resolvePrediction(1, Outcome.LEFT)).to.be.revertedWithCustomError(prediction, "PredictionAlreadyResolved");

      if (isVerbose) {
        console.log("Admin tried to resolve multiple times but failed.");
      }
    });

    //.PredictionAlreadyResolved
    it("should allow admin to resolve prediction before endTimestamp and prevent further bets", async function () {
      const { prediction, admin, bettor1, bettor2, betAsset } = await factory();
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

      const resolveTx = await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);
      await expect(resolveTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, Outcome.LEFT);

      await expect(fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.RIGHT,
      })).to.be.revertedWithCustomError(prediction, "PredictionAlreadyResolved");

      if (isVerbose) {
        console.log("Admin resolved the prediction before endTimestamp and no more bets can be placed.");
      }
    });

    //.InvalidOutcome
    it("should revert if expired or error outcome is manually passed", async function () {
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

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      await expect(prediction.connect(admin).resolvePrediction(1, Outcome.EXPIRED)).to.be.revertedWithCustomError(prediction, "InvalidOutcome");
      await expect(prediction.connect(admin).resolvePrediction(1, Outcome.ERROR)).to.be.revertedWithCustomError(prediction, "InvalidOutcome");

      if (isVerbose) {
        console.log("Admin tried to resolve with an invalid outcome and failed.");
      }
    });
  });
}
