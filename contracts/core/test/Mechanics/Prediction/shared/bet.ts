import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { makeTimestamps, Position, fundAndBet } from "./fixtures";

export function shouldBetPosition(factory: () => Promise<any>, isVerbose = false) {
  describe("betPosition", function () {
    //.PredictionNotStarted
    it("should not allow betting before start timestamp", async function () {
      const { prediction, bettor1, admin, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction
        .connect(admin)
        .startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await expect(
        fundAndBet(prediction, bettor1, {
          predictionId: 1,
          multiplier: 1,
          position: Position.LEFT,
        })
      ).to.be.revertedWithCustomError(prediction, "PredictionNotStarted");

      if (isVerbose) {
        console.log("Failed to place bet because betting period has not started.");
      }
    });
    
    //.PredictionEnded
    it("should not allow betting after end timestamp", async function () {
      const { prediction, bettor1, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(endTimestamp + BigInt(time.duration.seconds(10)));

      await expect(
        fundAndBet(prediction, bettor1, {
          predictionId: 1,
          multiplier: 1,
          position: Position.LEFT,
        })
      ).to.be.revertedWithCustomError(prediction, "PredictionEnded");

      if (isVerbose) {
        console.log("Failed to place bet because betting period has ended.");
      }
    });

    //.BetAmountTooLow
    it("should not allow betting with zero amount", async function () {
      const { prediction, bettor1, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await expect(
        fundAndBet(prediction, bettor1, {
          predictionId: 1,
          multiplier: 0,
          position: Position.LEFT,
        })
      ).to.be.revertedWithCustomError(prediction, "BetAmountTooLow");

      if (isVerbose) {
        console.log("Failed to place bet because bet amount is less than minimum bet units.");
      }
    });
    
    //.BetAlreadyPlaced
    it("should not allow to switch bet position", async function () {
      const { prediction, bettor1, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);
      
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await expect(
        fundAndBet(prediction, bettor1, {
          predictionId: 1,
          multiplier: 1,
          position: Position.RIGHT,
        })
      ).to.be.revertedWithCustomError(prediction, "BetAlreadyPlaced");

      if (isVerbose) {
        console.log("Failed to switch bet position as expected.");
      }
    });

    //.BetPlaced
    it("should allow betting on left and right positions", async function () {
      const {
        prediction,
        bettor1,
        bettor2,
        betAsset,
        token,
      } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);
      
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));
      
      const betMultiplier1 = BigInt(3);
      const initialBalance1 = betAsset.amount * betMultiplier1;

      const tx1 = await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: betMultiplier1,
        position: Position.LEFT,
      });

      await expect(tx1).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor1.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betMultiplier1 * betAsset.amount
        ],
        Position.LEFT
      );

      const betMultiplier2 = BigInt(5);
      const initialBalance2 = betAsset.amount * betMultiplier2;

      const tx2 = await fundAndBet(prediction, bettor2, {
        predictionId: 1,
        multiplier: betMultiplier2,
        position: Position.RIGHT,
      });
      
      await expect(tx2).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor2.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betMultiplier2 * betAsset.amount
        ],
        Position.RIGHT
      );

      const betInfo1 = await prediction.getBetInfo(1, bettor1);
      expect(betInfo1.multiplier).to.equal(betMultiplier1) ;
      expect(betInfo1.position).to.equal(Position.LEFT);

      const betInfo2 = await prediction.getBetInfo(1, bettor2);
      expect(betInfo2.multiplier).to.equal(betMultiplier2);
      expect(betInfo2.position).to.equal(Position.RIGHT);

      const betAmount1 = (betMultiplier1 * betAsset.amount);
      const finalBalance1 = await token.balanceOf(bettor1.address);
      expect(finalBalance1).to.equal(initialBalance1 - betAmount1);

      const betAmount2 = (betMultiplier2 * betAsset.amount);
      const finalBalance2 = await token.balanceOf(bettor2.address);
      expect(finalBalance2).to.equal(initialBalance2 - betAmount2);

      if (isVerbose) {
        console.log("Valid bets placed and prediction state updated correctly.");
        console.log(`Prediction ID: 1`);
        console.log(`Bettor1 Bet Units: ${betMultiplier1}`);
        console.log(`Bettor2 Bet Units: ${betMultiplier2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(betAsset.amount, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Bet Bettor1: ${ethers.formatUnits(finalBalance1, 18)}`);
        console.log(`Final Balance After Bet Bettor2: ${ethers.formatUnits(finalBalance2, 18)}`);
      }
    });

    //.placeBet
    it("should allow to increase bet", async function () {
      const { prediction, bettor1, token, betAsset } = await factory();
      const { expiryTimestamp, endTimestamp, startTimestamp } = await makeTimestamps();

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);
      
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      await fundAndBet(prediction, bettor1, {
        predictionId: 1,
        multiplier: 1,
        position: Position.LEFT,
      });

      const betInfo = await prediction.getBetInfo(1, bettor1);
      expect(betInfo.multiplier).to.equal(2n);
      expect(betInfo.position).to.equal(Position.LEFT);

      if (isVerbose) {
        console.log("Successfully placed multiple bets from the same user on the same prediction.");
      }
    });
  });
}
