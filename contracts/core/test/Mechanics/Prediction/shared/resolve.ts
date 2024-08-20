import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldResolvePrediction(factory: () => Promise<any>, isVerbose = false) {
  describe("resolve", function () {
    it("should handle zero rewardBaseUnits correctly and refund stakes to all bettors", async function () {
      const { prediction, operator, bettor1, title, resolutionTimestamp } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Operator resolves the prediction with zero base units
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left
      await expect(resolveTx)
        .to.emit(prediction, "EndPrediction")
        .withArgs(ethers.solidityPackedKeccak256(["string", "address"], [title, prediction.target]), 3); // Outcome.ERROR

      // Ensure there are no division by zero errors
      const rewardUnit = await prediction.getRewardUnit(title);
      expect(rewardUnit.amount).to.equal(0);
    });

    it("should only allow operator to resolve a prediction", async function () {
      const { prediction, operator, bettor1, bettor2, title, predictionId, betUnits1, betUnits2, resolutionTimestamp } = await factory();

      // Place bets before resolving
      await prediction.connect(bettor1).placeBetInTokens(title, betUnits1, 0); // Position.Left
      await prediction.connect(bettor2).placeBetInTokens(title, betUnits2, 1); // Position.Right

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Non-operator tries to resolve the prediction
      await expect(prediction.connect(bettor1).resolvePrediction(title, 0)).to.be.revertedWithCustomError(
        prediction,
        "AccessControlUnauthorizedAccount",
      );

      // Operator resolves the prediction
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left
      await expect(resolveTx)
        .to.emit(prediction, "EndPrediction")
        .withArgs(ethers.solidityPackedKeccak256(["string", "address"], [title, prediction.target]), 0); // Outcome.Left

      if (isVerbose) {
        console.log("Operator resolved the prediction.");
      }
    });

    it("should not allow resolving before resolution timestamp", async function () {
      const { prediction, operator, title } = await factory();

      // Try to resolve the prediction before resolution time
      await expect(prediction.connect(operator).resolvePrediction(title, 0)).to.be.revertedWithCustomError(
        prediction,
        "CannotResolveBeforeResolution",
      );

      if (isVerbose) {
        console.log("Operator tried to resolve before resolution timestamp but failed.");
      }
    });

    it("should not allow resolving multiple times", async function () {
      const { prediction, operator, bettor1, bettor2, title, predictionId, betUnits1, betUnits2, resolutionTimestamp } = await factory();

      // Place bets before resolving
      await prediction.connect(bettor1).placeBetInTokens(title, betUnits1, 0); // Position.Left
      await prediction.connect(bettor2).placeBetInTokens(title, betUnits2, 1); // Position.Right

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction
      await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left

      // Try to resolve the prediction again
      await expect(prediction.connect(operator).resolvePrediction(title, 0)).to.be.revertedWithCustomError(
        prediction,
        "PredictionAlreadyResolved",
      );

      if (isVerbose) {
        console.log("Operator tried to resolve multiple times but failed.");
      }
    });

    it("should not allow resolving prediction as error before expiry time", async function () {
      const { prediction, operator, title, resolutionTimestamp } = await factory();

      // Move time forward to resolution time but before expiry time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Try to resolve the prediction as error before expiry time
      await expect(prediction.connect(operator).resolvePredictionError(title)).to.be.revertedWithCustomError(
        prediction,
        "ExpiryTimeNotPassed",
      );

      if (isVerbose) {
        console.log("Operator tried to resolve as error before expiry time but failed.");
      }
    });

    it("should allow anyone resolving prediction as error after expiry time", async function () {
      const { prediction, bettor1, title, expiryTimestamp } = await factory();

      // Move time forward to expiry time
      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction as error
      const resolveErrorTx = await prediction.connect(bettor1).resolvePredictionError(title);
      await expect(resolveErrorTx)
        .to.emit(prediction, "EndPrediction")
        .withArgs(ethers.solidityPackedKeccak256(["string", "address"], [title, prediction.target]), 3); // Outcome.ERROR

      if (isVerbose) {
        console.log("Bettor resolved the prediction as error after expiry time.");
      }
    });
  });
}
