import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

enum Position {
  Left,
  Right
}

export function shouldBetPosition(factory: () => Promise<any>, isVerbose = false) {
  describe.only("betPosition", function () {    
    it("should not allow betting after end timestamp", async function () {
      const { prediction, bettor1, title, betUnits1, endTimestamp } = await factory();

      // Move time forward to after the end timestamp
      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      await expect(
        prediction.connect(bettor1).placeBetInTokens(title, betUnits1, Position.Left)
      ).to.be.revertedWithCustomError(prediction, "BettingEnded");

      if (isVerbose) {
        console.log("Failed to place bet because betting period has ended.");
      }
    });

    it("should not allow betting with amount less than minimum bet units", async function () {
      const { prediction, bettor1, title, startTimestamp } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      const minBetUnits = await prediction.minBetUnits();
      const betUnits = minBetUnits - 1n;

      await expect(
        prediction.connect(bettor1).placeBetInTokens(title, betUnits, Position.Left)
      ).to.be.revertedWithCustomError(prediction, "BetAmountTooLow");

      if (isVerbose) {
        console.log("Failed to place bet because bet amount is less than minimum bet units.");
      }
    });

    it("should not allow multiple bets from the same user on the same prediction", async function () {
      const { prediction, bettor1, title, betUnits1, startTimestamp } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      // Place the first bet
      await prediction.connect(bettor1).placeBetInTokens(title, betUnits1, Position.Left);

      // Try to place another bet
      await expect(
        prediction.connect(bettor1).placeBetInTokens(title, betUnits1, Position.Left)
      ).to.be.revertedWithCustomError(prediction, "BetAlreadyPlaced");

      if (isVerbose) {
        console.log("Failed to place multiple bets from the same user on the same prediction.");
      }
    });

    it("should allow betting on left and right positions", async function () {
      const {
        prediction,
        bettor1,
        bettor2,
        title,
        betUnits1,
        betUnits2,
        startTimestamp,
        predictionId,
        stakeUnit,
        betAmount1,
        betAmount2,
        token,
        initialBalance1,
        initialBalance2,
      } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      // Bettor1 bets on Left
      const tx1 = await prediction.connect(bettor1).placeBetInTokens(title, betUnits1, Position.Left);
      await expect(tx1).to.emit(prediction, "BetPlaced").withArgs(bettor1.address, predictionId, betUnits1, Position.Left);

      // Bettor2 bets on Right
      const tx2 = await prediction.connect(bettor2).placeBetInTokens(title, betUnits2, Position.Right);
      await expect(tx2).to.emit(prediction, "BetPlaced").withArgs(bettor2.address, predictionId, betUnits2, Position.Right);

      // Check BetInfo
      const betInfo1 = await prediction.ledger(predictionId, bettor1.address);
      expect(betInfo1.units).to.equal(betUnits1);
      expect(betInfo1.position).to.equal(Position.Left);

      const betInfo2 = await prediction.ledger(predictionId, bettor2.address);
      expect(betInfo2.units).to.equal(betUnits2);
      expect(betInfo2.position).to.equal(Position.Right);

      // Check after-betting balances
      const finalBalance1 = await token.balanceOf(bettor1.address);
      const finalBalance2 = await token.balanceOf(bettor2.address);
      expect(finalBalance1).to.equal(initialBalance1 - betAmount1);
      expect(finalBalance2).to.equal(initialBalance2 - betAmount2);

      if (isVerbose) {
        console.log("Valid bets placed and prediction state updated correctly.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Bettor1 Bet Units: ${betUnits1}`);
        console.log(`Bettor2 Bet Units: ${betUnits2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(stakeUnit.amount, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Bet Bettor1: ${ethers.formatUnits(finalBalance1, 18)}`);
        console.log(`Final Balance After Bet Bettor2: ${ethers.formatUnits(finalBalance2, 18)}`);
      }
    });
  });
}
