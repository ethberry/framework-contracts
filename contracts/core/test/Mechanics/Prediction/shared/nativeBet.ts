import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

enum Position {
  LEFT,
  RIGHT
}

export function shouldBetPositionNative(factory: () => Promise<any>, isVerbose = false) {
  describe("betPositionNative", function () {
    it("should allow betting with native Ether", async function () {
      const { prediction, bettor1, bettor2, betAsset, startTimestamp, initialBalance1, initialBalance2 } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      const betUnits1 = BigInt(3);
      const betUnits2 = BigInt(5);

      const betAmount1 = betUnits1 * betAsset.amount;
      const betAmount2 = betUnits2 * betAsset.amount;

      // Bettor1 bets on Left
      const tx1 = await prediction.connect(bettor1).placeBet(1, betUnits1, Position.LEFT, { value: betAmount1 });
      await expect(tx1).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor1.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betAmount1
        ],
        Position.LEFT
      );

      // Bettor2 bets on Right
      const tx2 = await prediction.connect(bettor2).placeBet(1, betUnits2, Position.RIGHT, { value: betAmount2 });
      await expect(tx2).to.emit(prediction, "BetPlaced").withArgs(
        1,
        bettor2.address,
        [
          betAsset.tokenType,
          betAsset.token,
          betAsset.tokenId,
          betAmount2
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

      // Check after-betting balances
      const finalBalance1 = await ethers.provider.getBalance(bettor1.address);
      const finalBalance2 = await ethers.provider.getBalance(bettor2.address);
      expect(finalBalance1).to.be.below(initialBalance1 - betAmount1);
      expect(finalBalance2).to.be.below(initialBalance2 - betAmount2);

      if (isVerbose) {
        console.log("Valid bets placed with native Ether and prediction state updated correctly.");
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

    it("should not allow betting with value less than bet asset for prediction", async function () {
      const { prediction, bettor1, betAsset, startTimestamp } = await factory();

      // Move time forward to allow betting
      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      const betUnits = BigInt(1);
      const insufficientBetAmount = betAsset.amount - BigInt(1); // Less than required bet amount

      await expect(
        prediction.connect(bettor1).placeBet(1, betUnits, Position.LEFT, { value: insufficientBetAmount })
      ).to.be.revertedWithCustomError(prediction, "ETHInsufficientBalance");

      if (isVerbose) {
        console.log("Failed to place bet because bet amount is less than minimum required.");
      }
    });
  });
}
