import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldStartPrediction(factory: () => Promise<any>, isVerbose = false) {
  describe("startPrediction", function () {
    it("should only allow operator to start a prediction", async function () {
      const { prediction, operator, bettor1 } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      await expect(
        prediction
          .connect(bettor1)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.be.revertedWithCustomError(prediction, "AccessControlUnauthorizedAccount");

      await expect(
        prediction
          .connect(operator)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.emit(prediction, "StartPrediction");

      if (isVerbose) {
        console.log("Operator started the prediction.");
        console.log(`Title: ${title}`);
        console.log(`Start Timestamp: ${startTimestamp}`);
        console.log(`End Timestamp: ${endTimestamp}`);
        console.log(`Resolution Timestamp: ${resolutionTimestamp}`);
        console.log(`Expiry Timestamp: ${expiryTimestamp}`);
      }
    });

    it("should revert if startTimestamp is not less than endTimestamp", async function () {
      const { prediction, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp;
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      await expect(
        prediction
          .connect(operator)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.be.revertedWithCustomError(prediction, "BettingNotStarted");

      if (isVerbose) {
        console.log("Failed to start prediction because startTimestamp is not less than endTimestamp.");
      }
    });

    it("should revert if endTimestamp is not less than resolutionTimestamp", async function () {
      const { prediction, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp;
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      await expect(
        prediction
          .connect(operator)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.be.revertedWithCustomError(prediction, "BettingEnded");

      if (isVerbose) {
        console.log("Failed to start prediction because endTimestamp is not less than resolutionTimestamp.");
      }
    });

    it("should revert if resolutionTimestamp is not less than expiryTimestamp", async function () {
      const { prediction, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp;

      await expect(
        prediction
          .connect(operator)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.be.revertedWithCustomError(prediction, "CannotResolveBeforeResolution");

      if (isVerbose) {
        console.log("Failed to start prediction because resolutionTimestamp is not less than expiryTimestamp.");
      }
    });

    it("should revert if prediction already exists", async function () {
      const { prediction, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      await prediction
        .connect(operator)
        .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp);

      await expect(
        prediction
          .connect(operator)
          .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp),
      ).to.be.revertedWithCustomError(prediction, "PredictionAlreadyExists");
    });

    it("should start a prediction with correct parameters", async function () {
      const { prediction, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      const tx = await prediction
        .connect(operator)
        .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp);
      await expect(tx)
        .to.emit(prediction, "StartPrediction")
        .withArgs(ethers.solidityPackedKeccak256(["string", "address"], [title, prediction.target]), title);

      const predictionId = ethers.solidityPackedKeccak256(["string", "address"], [title, prediction.target]);
      const predictionRound = await prediction.predictions(predictionId);

      expect(predictionRound.id).to.equal(predictionId);
      expect(predictionRound.title).to.equal(title);
      expect(predictionRound.startTimestamp).to.equal(startTimestamp);
      expect(predictionRound.endTimestamp).to.equal(endTimestamp);
      expect(predictionRound.resolutionTimestamp).to.equal(resolutionTimestamp);
      expect(predictionRound.expiryTimestamp).to.equal(expiryTimestamp);
      expect(predictionRound.betUnitsOnLeft).to.equal(0);
      expect(predictionRound.betUnitsOnRight).to.equal(0);
      expect(predictionRound.rewardUnit.tokenType).to.equal(1);
      expect(predictionRound.outcome).to.equal(3); // Outcome.ERROR
      expect(predictionRound.resolved).to.be.equal(false);

      if (isVerbose) {
        console.log("Prediction started with correct parameters.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Title: ${title}`);
        console.log(`Start Timestamp: ${startTimestamp}`);
        console.log(`End Timestamp: ${endTimestamp}`);
        console.log(`Resolution Timestamp: ${resolutionTimestamp}`);
        console.log(`Expiry Timestamp: ${expiryTimestamp}`);
      }
    });

    it("should not allow betting before start timestamp", async function () {
      const { prediction, bettor1, betUnits1, operator } = await factory();

      const title = "Prediction Title";
      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const resolutionTimestamp = endTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = resolutionTimestamp + BigInt(time.duration.hours(1));

      await prediction
        .connect(operator)
        .startPrediction(title, startTimestamp, endTimestamp, resolutionTimestamp, expiryTimestamp);

      await expect(
        prediction.connect(bettor1).placeBetInTokens(title, betUnits1, 0)
      ).to.be.revertedWithCustomError(prediction, "BettingNotStarted");

      if (isVerbose) {
        console.log("Failed to place bet because betting period has not started.");
      }
    });
  });
}
