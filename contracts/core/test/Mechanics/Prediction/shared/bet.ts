import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

enum Position {
  LEFT,
  RIGHT
}

export function shouldBetPosition(factory: () => Promise<any>, isVerbose = false) {
  describe("betPosition", function () {
    it("should not allow betting after end timestamp", async function () {
      const { prediction, bettor1, betUnits1, endTimestamp } = await factory();

      // Move time forward to after the end timestamp
      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      await expect(
        prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT)
      ).to.be.revertedWithCustomError(prediction, "PredictionEnded");

      if (isVerbose) {
        console.log("Failed to place bet because betting period has ended.");
      }
    });

    it("should not allow betting with zero amount", async function () {
      const { prediction, bettor1, startTimestamp } = await factory();

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      const betUnits = 0;

      await expect(
        prediction.connect(bettor1).placeBet(1, betUnits, Position.LEFT)
      ).to.be.revertedWithCustomError(prediction, "BetAmountTooLow");

      if (isVerbose) {
        console.log("Failed to place bet because bet amount is less than minimum bet units.");
      }
    });

    it("should allow to increase bet", async function () {
      const { prediction, bettor1, betUnits1, startTimestamp, token, betAsset } = await factory();

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await token.mint(bettor1, betAsset.amount * betUnits1);
      await token.connect(bettor1).approve(prediction, (await token.allowance(bettor1, prediction) + betAsset.amount * betUnits1));

      await prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT);

      await prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT);

      const betInfo = await prediction.getBetInfo(1, bettor1.address);
      expect(betInfo.multiplier).to.equal(betUnits1 * 2n);
      expect(betInfo.position).to.equal(Position.LEFT);

      if (isVerbose) {
        console.log("Successfully placed multiple bets from the same user on the same prediction.");
      }
    });
    
    it("should not allow to switch bet position", async function () {
      const { prediction, bettor1, betUnits1, startTimestamp } = await factory();

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT);

      await expect(
        prediction.connect(bettor1).placeBet(1, betUnits1, Position.RIGHT)
      ).to.be.revertedWithCustomError(prediction, "BetAlreadyPlaced");

      if (isVerbose) {
        console.log("Failed to switch bet position as expected.");
      }
    });

    it("should allow betting on left and right positions", async function () {
      const {
        prediction,
        bettor1,
        bettor2,
        betUnits1,
        betUnits2,
        startTimestamp,
        betAsset,
        token,
        initialBalance1,
        initialBalance2,
      } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      // Bettor1 bets on Left
      const tx1 = await prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT);
      await expect(tx1).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor1.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betUnits1 * betAsset.amount
        ],
        Position.LEFT
      );

      // Bettor2 bets on Right
      const tx2 = await prediction.connect(bettor2).placeBet(1, betUnits2, Position.RIGHT);
      await expect(tx2).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor2.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betUnits2 * betAsset.amount
        ],
        Position.RIGHT
      );

      // Check BetInfo
      const betInfo1 = await prediction.getBetInfo(1, bettor1.address);
      expect(betInfo1.multiplier).to.equal(betUnits1);
      expect(betInfo1.position).to.equal(Position.LEFT);

      const betInfo2 = await prediction.getBetInfo(1, bettor2.address);
      expect(betInfo2.multiplier).to.equal(betUnits2);
      expect(betInfo2.position).to.equal(Position.RIGHT);

      const betAmount1 = (betUnits1 * betAsset.amount);
      const betAmount2 = (betUnits2 * betAsset.amount);

      // Check after-betting balances
      const finalBalance1 = await token.balanceOf(bettor1.address);
      const finalBalance2 = await token.balanceOf(bettor2.address);
      expect(finalBalance1).to.equal(initialBalance1 - betAmount1);
      expect(finalBalance2).to.equal(initialBalance2 - betAmount2);

      if (isVerbose) {
        console.log("Valid bets placed and prediction state updated correctly.");
        console.log(`Prediction ID: 1`);
        console.log(`Bettor1 Bet Units: ${betUnits1}`);
        console.log(`Bettor2 Bet Units: ${betUnits2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(betAsset.amount, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Bet Bettor1: ${ethers.formatUnits(finalBalance1, 18)}`);
        console.log(`Final Balance After Bet Bettor2: ${ethers.formatUnits(finalBalance2, 18)}`);
      }
    });
  });
}
