import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldResolvePrediction(factory: () => Promise<any>, isVerbose = false) {
  describe("resolve", function () {
    it("should resolve prediction into error state when there are no bettors on either side", async function () {
      const { prediction, admin, bettor1, betAsset, startTimestamp, endTimestamp, expiryTimestamp } = await factory();

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      const resolveTx = await prediction.connect(admin).resolvePrediction(1, 0);
      await expect(resolveTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, 3); // Outcome.ERROR

      expect((await prediction.getPrediction(1)).rewardAsset.amount).to.equal(0);
    });

    it("should resolve prediction into expired state after expiry time by admin", async function () {
      const { prediction, admin, bettor1, startTimestamp, endTimestamp, expiryTimestamp } = await factory();

      await time.increaseTo(BigInt(expiryTimestamp) + BigInt(time.duration.seconds(10)));

      await expect(prediction.connect(bettor1).resolvePrediction(1, 3)).to.be.revertedWithCustomError(
        prediction,
        "AccessControlUnauthorizedAccount"
      );

      const resolveErrorTx = await prediction.connect(admin).resolvePrediction(1, 3); // Outcome.ERROR
      await expect(resolveErrorTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, 3); // Outcome.ERROR

      if (isVerbose) {
        console.log("Bettor resolved the prediction as error after expiry time.");
      }
    });

    it("should not allow resolving by non-admin", async function () {
      const { prediction, bettor1, bettor2, title, predictionId, betUnits1, betUnits2 } = await factory();

      await prediction.connect(bettor1).placeBet(1, betUnits1, 0); // Position.Left
      await prediction.connect(bettor2).placeBet(1, betUnits2, 1); // Position.Right

      await expect(prediction.connect(bettor1).resolvePrediction(1, 0)).to.be.revertedWithCustomError(
        prediction,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("should not allow resolving multiple times", async function () {
      const { prediction, admin, bettor1, bettor2, betAsset, startTimestamp, endTimestamp, expiryTimestamp } = await factory();

      await prediction.connect(bettor1).placeBet(1, 3, 0); // Position.LEFT
      await prediction.connect(bettor2).placeBet(1, 5, 1); // Position.RIGHT

      await prediction.connect(admin).resolvePrediction(1, 0); // Outcome.LEFT

      await expect(prediction.connect(admin).resolvePrediction(1, 0)).to.be.revertedWithCustomError(prediction, "PredictionAlreadyResolved");

      if (isVerbose) {
        console.log("Admin tried to resolve multiple times but failed.");
      }
    });

    it("should allow admin to resolve prediction before endTimestamp and prevent further bets", async function () {
      const { prediction, admin, bettor1, bettor2, betUnits1, betUnits2, startTimestamp, endTimestamp } = await factory();

      await prediction.connect(bettor1).placeBet(1, betUnits1, 0); // Position.LEFT
      await prediction.connect(bettor2).placeBet(1, betUnits2, 1); // Position.RIGHT

      // Resolve prediction before endTimestamp
      const resolveTx = await prediction.connect(admin).resolvePrediction(1, 0); // Outcome.LEFT
      await expect(resolveTx)
        .to.emit(prediction, "PredictionEnd")
        .withArgs(1, 0); // Outcome.LEFT

      // Ensure no more bets can be placed
      await expect(prediction.connect(bettor1).placeBet(1, betUnits1, 0)).to.be.revertedWithCustomError(prediction, "PredictionAlreadyResolved");

      if (isVerbose) {
        console.log("Admin resolved the prediction before endTimestamp and no more bets can be placed.");
      }
    });

    it("should revert if an invalid outcome is passed", async function () {
      const { bettor1, bettor2, betUnits1, betUnits2, prediction, admin, startTimestamp, endTimestamp, expiryTimestamp } = await factory();

      await prediction.connect(bettor1).placeBet(1, betUnits1, 0); // Position.LEFT
      await prediction.connect(bettor2).placeBet(1, betUnits2, 1); // Position.RIGHT

      await time.increaseTo(BigInt(endTimestamp) + BigInt(time.duration.seconds(10)));

      await expect(prediction.connect(admin).resolvePrediction(1, 3)).to.be.revertedWithCustomError(prediction, "InvalidOutcome"); // Outcome.ERROR
      await expect(prediction.connect(admin).resolvePrediction(1, 4)).to.be.revertedWithCustomError(prediction, "InvalidOutcome"); // Outcome.EXPIRED

      if (isVerbose) {
        console.log("Admin tried to resolve with an invalid outcome and failed.");
      }
    });
  });
}
