import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldStartPrediction(factory: () => Promise<any>, isVerbose = false) {
  describe("startPrediction", function () {
    //.AccessControlUnauthorizedAccount
    it("should revert if non-admin tried to start a prediction", async function () {
      const { prediction, admin, bettor1, betAsset } = await factory();

      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = endTimestamp + BigInt(time.duration.hours(1));

      await expect(
        prediction
          .connect(bettor1)
          .startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset),
      ).to.be.revertedWithCustomError(prediction, "AccessControlUnauthorizedAccount");
    });

    //.PredictionNotStarted
    it("should revert if startTimestamp is not less than endTimestamp", async function () {
      const { prediction, admin, betAsset } = await factory();

      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp;
      const expiryTimestamp = endTimestamp + BigInt(time.duration.hours(1));

      await expect(
        prediction
          .connect(admin)
          .startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset),
      ).to.be.revertedWithCustomError(prediction, "PredictionNotStarted");

      if (isVerbose) {
        console.log("Failed to start prediction because startTimestamp is not less than endTimestamp.");
      }
    });

    //.PredictionEnded
    it("should revert if endTimestamp is not less than expiryTimestamp", async function () {
      const { prediction, admin, betAsset } = await factory();

      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = endTimestamp;

      await expect(
        prediction
          .connect(admin)
          .startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset),
      ).to.be.revertedWithCustomError(prediction, "PredictionEnded");

      if (isVerbose) {
        console.log("Failed to start prediction because endTimestamp is not less than expiryTimestamp.");
      }
    });

    //.startPrediction
    it("should allow to create multiple independent predictions", async function () {
      const { prediction, admin, betAsset } = await factory();

      const startTimestamp1 = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp1 = startTimestamp1 + BigInt(time.duration.hours(1));
      const expiryTimestamp1 = endTimestamp1 + BigInt(time.duration.hours(1));

      await prediction
        .connect(admin)
        .startPrediction(startTimestamp1, endTimestamp1, expiryTimestamp1, betAsset);

      const startTimestamp2 = BigInt(await time.latest()) + BigInt(time.duration.minutes(2));
      const endTimestamp2 = startTimestamp2 + BigInt(time.duration.hours(1));
      const expiryTimestamp2 = endTimestamp2 + BigInt(time.duration.hours(1));

      await prediction
        .connect(admin)
        .startPrediction(startTimestamp2, endTimestamp2, expiryTimestamp2, betAsset);

      const predictionMatch1 = await prediction.getPrediction(1);
      const predictionMatch2 = await prediction.getPrediction(2);

      expect(predictionMatch1.startTimestamp).to.equal(startTimestamp1);
      expect(predictionMatch1.endTimestamp).to.equal(endTimestamp1);
      expect(predictionMatch1.expiryTimestamp).to.equal(expiryTimestamp1);
      expect(predictionMatch1.betAsset.tokenType).to.equal(1);
      expect(predictionMatch1.betAsset.amount).to.equal(ethers.parseUnits("5", 18));
      expect(predictionMatch1.outcome).to.equal(3);
      expect(predictionMatch1.resolved).to.be.false;

      expect(predictionMatch2.startTimestamp).to.equal(startTimestamp2);
      expect(predictionMatch2.endTimestamp).to.equal(endTimestamp2);
      expect(predictionMatch2.expiryTimestamp).to.equal(expiryTimestamp2);
      expect(predictionMatch2.betAsset.tokenType).to.equal(1);
      expect(predictionMatch2.betAsset.amount).to.equal(ethers.parseUnits("5", 18));
      expect(predictionMatch2.outcome).to.equal(3);
      expect(predictionMatch2.resolved).to.be.false;

      if (isVerbose) {
        console.log("Created another prediction with auto-incremented id.");
        console.log(`Prediction 1 - Start Timestamp: ${startTimestamp1}`);
        console.log(`Prediction 1 - End Timestamp: ${endTimestamp1}`);
        console.log(`Prediction 1 - Expiry Timestamp: ${expiryTimestamp1}`);
        console.log(`Prediction 2 - Start Timestamp: ${startTimestamp2}`);
        console.log(`Prediction 2 - End Timestamp: ${endTimestamp2}`);
        console.log(`Prediction 2 - Expiry Timestamp: ${expiryTimestamp2}`);
      }
    });
  });
}
