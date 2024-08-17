import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldClaim(factory: () => Promise<any>, isVerbose = false) {
  describe("claim", function () {
    it("should distribute rewards in LEFT outcome", async function () {
      const {
        prediction,
        token,
        operator,
        bettor1,
        resolutionTimestamp,
        title,
        predictionId,
        betUnits1,
        betUnits2,
        stakeUnit,
        initialBalance1,
        betAmount1,
        betAmount2,
        treasuryFee,
      } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Left as the outcome
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left
      await expect(resolveTx).to.emit(prediction, "EndPrediction").withArgs(predictionId, 0); // Outcome.Left

      // Bettor1 claims reward
      const claimTx1 = await prediction.connect(bettor1).claim(title);
      const expectedReward1 =
        betUnits1 * stakeUnit +
        (betUnits1 * (betUnits2 * stakeUnit - (betUnits2 * stakeUnit * treasuryFee) / 10000n)) / betUnits1;
      await expect(claimTx1).to.emit(prediction, "Claim").withArgs(bettor1.address, predictionId, expectedReward1);

      const finalBalanceAfterClaim1 = await token.balanceOf(bettor1.address);
      expect(finalBalanceAfterClaim1).to.equal(initialBalance1 + expectedReward1 - betAmount1);

      if (isVerbose) {
        console.log("Prediction resolved with Left as the outcome.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Bettor1 Bet Units: ${betUnits1}`);
        console.log(`Bettor2 Bet Units: ${betUnits2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(stakeUnit, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Claim Bettor1: ${ethers.formatUnits(finalBalanceAfterClaim1, 18)}`);
      }
    });

    it("should distribute rewards in RIGHT outcome", async function () {
      const {
        prediction,
        token,
        operator,
        bettor2,
        resolutionTimestamp,
        title,
        predictionId,
        betUnits1,
        betUnits2,
        stakeUnit,
        initialBalance1,
        initialBalance2,
        betAmount2,
        betAmount1,
        treasuryFee,
      } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Right as the outcome
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 1); // Outcome.Right
      await expect(resolveTx).to.emit(prediction, "EndPrediction").withArgs(predictionId, 1); // Outcome.Right

      // Bettor2 claims reward
      const claimTx2 = await prediction.connect(bettor2).claim(title);
      const expectedReward2 =
        betUnits2 * stakeUnit +
        (betUnits2 * (betUnits1 * stakeUnit - (betUnits1 * stakeUnit * treasuryFee) / 10000n)) / betUnits2;
      await expect(claimTx2).to.emit(prediction, "Claim").withArgs(bettor2.address, predictionId, expectedReward2);

      const finalBalanceAfterClaim2 = await token.balanceOf(bettor2.address);
      expect(finalBalanceAfterClaim2).to.equal(initialBalance2 + expectedReward2 - betAmount2);

      if (isVerbose) {
        console.log("Prediction resolved with Right as the outcome.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Bettor1 Bet Units: ${betUnits1}`);
        console.log(`Bettor2 Bet Units: ${betUnits2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(stakeUnit, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Claim Bettor2: ${ethers.formatUnits(finalBalanceAfterClaim2, 18)}`);
      }
    });

    it("should refund stakes in DRAW outcome", async function () {
      const {
        prediction,
        token,
        operator,
        bettor1,
        bettor2,
        resolutionTimestamp,
        title,
        predictionId,
        betUnits1,
        betUnits2,
        stakeUnit,
        initialBalance1,
        betAmount1,
        betAmount2,
        initialBalance2,
      } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with DRAW as the outcome
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 2); // Outcome.DRAW
      await expect(resolveTx).to.emit(prediction, "EndPrediction").withArgs(predictionId, 2); // Outcome.DRAW

      // Bettor1 claims reward
      const claimTx1 = await prediction.connect(bettor1).claim(title);
      await expect(claimTx1).to.emit(prediction, "Claim").withArgs(bettor1.address, predictionId, betAmount1);

      const finalBalanceAfterClaim1 = await token.balanceOf(bettor1.address);
      expect(finalBalanceAfterClaim1).to.equal(initialBalance1);

      // Bettor2 claims reward
      const claimTx2 = await prediction.connect(bettor2).claim(title);
      await expect(claimTx2).to.emit(prediction, "Claim").withArgs(bettor2.address, predictionId, betAmount2);

      const finalBalanceAfterClaim2 = await token.balanceOf(bettor2.address);
      expect(finalBalanceAfterClaim2).to.equal(initialBalance2);

      if (isVerbose) {
        console.log("Prediction resolved with DRAW as the outcome.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Bettor1 Bet Units: ${betUnits1}`);
        console.log(`Bettor2 Bet Units: ${betUnits2}`);
        console.log(`Stake Unit: ${ethers.formatUnits(stakeUnit, 18)}`);
        console.log(`Initial Balance Bettor1: ${ethers.formatUnits(initialBalance1, 18)}`);
        console.log(`Bet Amount Bettor1: ${ethers.formatUnits(betAmount1, 18)}`);
        console.log(`Bet Amount Bettor2: ${ethers.formatUnits(betAmount2, 18)}`);
        console.log(`Final Balance After Claim Bettor1: ${ethers.formatUnits(finalBalanceAfterClaim1, 18)}`);
        console.log(`Final Balance After Claim Bettor2: ${ethers.formatUnits(finalBalanceAfterClaim2, 18)}`);
      }
    });

    it("should fail to claim by loser", async function () {
      const { prediction, operator, bettor2, resolutionTimestamp, title } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Left as the outcome
      await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left

      // Bettor2 tries to claim but should fail as they bet on the losing side
      await expect(prediction.connect(bettor2).claim(title)).to.be.revertedWithCustomError(
        prediction,
        "NotEligibleForClaim",
      );

      if (isVerbose) {
        console.log("Bettor2 tried to claim but failed as they bet on the losing side.");
      }
    });

    it("should not allow claiming before resolution timestamp", async function () {
      const { prediction, bettor1, title } = await factory();

      await expect(prediction.connect(bettor1).claim(title)).to.be.revertedWithCustomError(
        prediction,
        "ResolutionNotAvailable",
      );

      if (isVerbose) {
        console.log("Bettor1 tried to claim before resolution timestamp but failed.");
      }
    });

    it("should not allow claiming multiple times", async function () {
      const { prediction, operator, bettor1, resolutionTimestamp, title } = await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Left as the outcome
      await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left

      // Bettor1 claims reward
      await prediction.connect(bettor1).claim(title);

      // Bettor1 tries to claim again but should fail
      await expect(prediction.connect(bettor1).claim(title)).to.be.revertedWithCustomError(
        prediction,
        "NotEligibleForClaim",
      );

      if (isVerbose) {
        console.log("Bettor1 tried to claim multiple times but failed.");
      }
    });

    it("should only allow operator to claim the treasury", async function () {
      const { prediction, token, operator, admin, stakeUnit, resolutionTimestamp, title, betUnits2, treasuryFee } =
        await factory();

      // Move time forward to resolution time
      await time.increaseTo(resolutionTimestamp + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Left as the outcome
      await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left

      // Operator claims the treasury
      const initialTreasuryBalance = await token.balanceOf(admin.address);
      await prediction.connect(operator).claimTreasury();
      const finalTreasuryBalance = await token.balanceOf(admin.address);

      const expectedTreasuryClaim = (betUnits2 * stakeUnit * treasuryFee) / 10000n;
      expect(finalTreasuryBalance - initialTreasuryBalance).to.equal(expectedTreasuryClaim);

      if (isVerbose) {
        console.log("Operator claimed the treasury.");
        console.log(`Initial Treasury Balance: ${ethers.formatUnits(initialTreasuryBalance, 18)}`);
        console.log(`Final Treasury Balance: ${ethers.formatUnits(finalTreasuryBalance, 18)}`);
      }
    });

    it("should distribute rewards correctly with multiple bettors on both sides", async function () {
      const { prediction, token, operator, title, predictionId, stakeUnit, treasuryFee, betUnits1, betUnits2 } =
        await factory();

      // Create additional bettors, skipping the first 5 accounts
      const additionalBettors = (await ethers.getSigners()).slice(5);

      // Define bettors
      const leftBettors = additionalBettors.slice(0, 3); // 3 bettors on the left side
      const rightBettors = additionalBettors.slice(3, 5); // 2 bettors on the right side

      // Define bet units and amounts
      const leftBetUnits = [3n, 5n, 7n];
      const rightBetUnits = [4n, 6n];

      // Fund and approve tokens for all bettors
      for (let i = 0; i < leftBettors.length; i++) {
        const betAmount = leftBetUnits[i] * stakeUnit;
        await token.mint(leftBettors[i].address, betAmount);
        await token.connect(leftBettors[i]).approve(prediction, betAmount);
      }

      for (let i = 0; i < rightBettors.length; i++) {
        const betAmount = rightBetUnits[i] * stakeUnit;
        await token.mint(rightBettors[i].address, betAmount);
        await token.connect(rightBettors[i]).approve(prediction, betAmount);
      }

      // Move time forward to allow betting
      const { startTimestamp, endTimestamp } = await prediction.predictions(predictionId);
      await time.increaseTo(BigInt(startTimestamp) + BigInt(time.duration.minutes(10)));

      // Place bets for left bettors
      for (let i = 0; i < leftBettors.length; i++) {
        const betTx = await prediction.connect(leftBettors[i]).betLeft(title, leftBetUnits[i]);
        await expect(betTx)
          .to.emit(prediction, "BetLeft")
          .withArgs(leftBettors[i].address, predictionId, leftBetUnits[i]);
      }

      // Place bets for right bettors
      for (let i = 0; i < rightBettors.length; i++) {
        const betTx = await prediction.connect(rightBettors[i]).betRight(title, rightBetUnits[i]);
        await expect(betTx)
          .to.emit(prediction, "BetRight")
          .withArgs(rightBettors[i].address, predictionId, rightBetUnits[i]);
      }

      // Move time forward to resolution time
      await time.increaseTo(endTimestamp + BigInt(time.duration.hours(1)) + BigInt(time.duration.seconds(10)));

      // Resolve the prediction with Left as the outcome
      const resolveTx = await prediction.connect(operator).resolvePrediction(title, 0); // Outcome.Left
      await expect(resolveTx).to.emit(prediction, "EndPrediction").withArgs(predictionId, 0); // Outcome.Left

      // Sum up the bet units
      const totalLeftUnits: number = leftBetUnits.reduce((acc: number, units: number) => acc + units, betUnits1);
      const totalRightUnits: number = rightBetUnits.reduce((acc: number, units: number) => acc + units, betUnits2);

      // Calculate the total reward pool for left bettors
      const totalRewardPool = totalRightUnits * stakeUnit - (totalRightUnits * stakeUnit * treasuryFee) / 10000n;

      // Claim rewards for left bettors
      for (let i = 0; i < leftBettors.length; i++) {
        const initialBalance = await token.balanceOf(leftBettors[i].address);
        const expectedReward =
          BigInt(leftBetUnits[i] * stakeUnit) + BigInt((leftBetUnits[i] * totalRewardPool) / totalLeftUnits);

        await prediction.connect(leftBettors[i]).claim(title);

        const finalBalanceAfterClaim = await token.balanceOf(leftBettors[i].address);

        if (isVerbose) {
          console.log(`Bettor ${i + 1} Initial Balance: ${initialBalance}`);
          console.log(`Bettor ${i + 1} Bet Units: ${leftBetUnits[i]}`);
          console.log(`Bettor ${i + 1} Stake Unit: ${stakeUnit}`);
          console.log(`Bettor ${i + 1} Total Reward Pool: ${totalRewardPool}`);
          console.log(`Bettor ${i + 1} Total Left Units: ${totalLeftUnits}`);
          console.log(`Bettor ${i + 1} Expected Reward: ${expectedReward}`);
          console.log(`Bettor ${i + 1} Actual Reward: ${finalBalanceAfterClaim - initialBalance}`);
        }

        expect(finalBalanceAfterClaim).to.be.equal(initialBalance + expectedReward);
      }

      // Ensure right bettors cannot claim rewards
      for (const bettor of rightBettors) {
        await expect(prediction.connect(bettor).claim(title)).to.be.revertedWithCustomError(
          prediction,
          "NotEligibleForClaim",
        );
      }

      if (isVerbose) {
        console.log("Prediction resolved with multiple bettors on both sides.");
        console.log(`Prediction ID: ${predictionId}`);
        console.log(`Stake Unit: ${ethers.formatUnits(stakeUnit, 18)}`);
        console.log(`Total Left Bet Units: ${totalLeftUnits}`);
        console.log(`Total Right Bet Units: ${totalRightUnits}`);
      }
    });
  });
}
