import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

enum Outcome {
  LEFT,
  RIGHT,
  DRAW,
  ERROR,
  EXPIRED
}

export function shouldClaim(factory: () => Promise<any>, isVerbose = false) {
  describe("claim", function () {
    it("should distribute rewards in LEFT outcome", async function () {
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, token, betAsset, admin } = await factory();

      // Resolve prediction with LEFT outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const initialBalance1 = await token.balanceOf(bettor1.address);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1.address);

      // Bettor2 should not be able to claim
      await expect(prediction.connect(bettor2).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      // Check reward distribution
      const expectedReward1 = betUnits1 * betAsset.amount + betUnits1 * (betUnits2 * betAsset.amount - (betUnits2 * betAsset.amount * 1000n / 10000n)) / betUnits1;
      expect(finalBalance1).to.equal(initialBalance1 + expectedReward1);

      if (isVerbose) {
        console.log("Rewards distributed correctly for LEFT outcome.");
      }
    });

    it("should distribute rewards in RIGHT outcome", async function () {
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, token, betAsset, admin } = await factory();

      // Resolve prediction with RIGHT outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.RIGHT);

      // Bettor2 claims reward
      const initialBalance2 = await token.balanceOf(bettor2.address);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2.address);

      // Bettor1 should not be able to claim
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      // Check reward distribution
      const expectedReward2 = betUnits2 * betAsset.amount + betUnits2 * (betUnits1 * betAsset.amount - (betUnits1 * betAsset.amount * 1000n / 10000n)) / betUnits2;
      expect(finalBalance2).to.equal(initialBalance2 + expectedReward2);

      if (isVerbose) {
        console.log("Rewards distributed correctly for RIGHT outcome.");
      }
    });

    it("should refund stakes in DRAW outcome", async function () {
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, token, betAsset, admin } = await factory();

      // Resolve prediction with DRAW outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.DRAW);

      // Bettor1 claims refund
      const initialBalance1 = await token.balanceOf(bettor1.address);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1.address);

      // Bettor2 claims refund
      const initialBalance2 = await token.balanceOf(bettor2.address);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2.address);

      // Check refund distribution
      expect(finalBalance1).to.equal(initialBalance1 + betUnits1 * betAsset.amount);
      expect(finalBalance2).to.equal(initialBalance2 + betUnits2 * betAsset.amount);

      if (isVerbose) {
        console.log("Stakes refunded correctly for DRAW outcome.");
      }
    });

    it("should revert if tried to claim by non-winner side", async function () {
      const { prediction, bettor1, bettor2, admin } = await factory();

      // Resolve prediction with LEFT outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor2 tries to claim
      await expect(prediction.connect(bettor2).claim(1)).to.be.revertedWithCustomError(prediction, "NotEligibleForClaim");

      if (isVerbose) {
        console.log("Claim by non-winner side reverted as expected.");
      }
    });

    it("should revert if tried to claim before prediction is resolved", async function () {
      const { prediction, bettor1 } = await factory();

      // Bettor1 tries to claim before resolution
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "CannotClaimBeforeResolution");

      if (isVerbose) {
        console.log("Claim before resolution reverted as expected.");
      }
    });

    it("should revert if tried to claim multiple times", async function () {
      const { prediction, bettor1, admin } = await factory();

      // Resolve prediction with LEFT outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      await prediction.connect(bettor1).claim(1);

      // Bettor1 tries to claim again
      await expect(prediction.connect(bettor1).claim(1)).to.be.revertedWithCustomError(prediction, "RewardAlreadyClaimed");

      if (isVerbose) {
        console.log("Multiple claims reverted as expected.");
      }
    });

    it("should revert if tried to claim treasury by non-admin", async function () {
      const { prediction, bettor1 } = await factory();

      // Non-admin tries to claim treasury
      await expect(prediction.connect(bettor1).claimTreasury()).to.be.revertedWithCustomError(prediction, "AccessControlUnauthorizedAccount");

      if (isVerbose) {
        console.log("Non-admin treasury claim reverted as expected.");
      }
    });

    it("should distribute rewards correctly when multiple bettors on both sides", async function () {
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, token, betAsset, admin } = await factory();

      // Additional bettors
      const [bettor3, bettor4] = await ethers.getSigners();
      const betUnits3 = BigInt(2);
      const betUnits4 = BigInt(4);

      await token.mint(bettor3, betAsset.amount * betUnits3);
      await token.mint(bettor4, betAsset.amount * betUnits4);
      await token.connect(bettor3).approve(prediction, betAsset.amount * betUnits3);
      await token.connect(bettor4).approve(prediction, betAsset.amount * betUnits4);

      await prediction.connect(bettor3).placeBet(1, betUnits3, 0); // Position.LEFT
      await prediction.connect(bettor4).placeBet(1, betUnits4, 1); // Position.RIGHT

      // Resolve prediction with LEFT outcome
      await prediction.connect(admin).resolvePrediction(1, Outcome.LEFT);

      // Bettor1 claims reward
      const initialBalance1 = await token.balanceOf(bettor1.address);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1.address);

      // Bettor3 claims reward
      const initialBalance3 = await token.balanceOf(bettor3.address);
      await prediction.connect(bettor3).claim(1);
      const finalBalance3 = await token.balanceOf(bettor3.address);

      // Check reward distribution
      const totalLeftUnits = betUnits1 + betUnits3;
      const totalRightAmount = betUnits2 * betAsset.amount + betUnits4 * betAsset.amount;
      const treasuryAmt = totalRightAmount * 1000n / 10000n;
      const rewardAmount = totalRightAmount - treasuryAmt;

      const expectedReward1 = betUnits1 * betAsset.amount + betUnits1 * rewardAmount / totalLeftUnits;
      const expectedReward3 = betUnits3 * betAsset.amount + betUnits3 * rewardAmount / totalLeftUnits;

      expect(finalBalance1).to.equal(initialBalance1 + expectedReward1);
      expect(finalBalance3).to.equal(initialBalance3 + expectedReward3);

      if (isVerbose) {
        console.log("Rewards distributed correctly for multiple bettors on both sides.");
      }
    });

    it("should refund bets when tried to claim unresolved prediction after expiry time", async function () {
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, token, betAsset, expiryTimestamp } = await factory();

      // Move time forward to after the expiry timestamp
      await time.increaseTo(expiryTimestamp + BigInt(time.duration.seconds(10)));

      // Bettor1 claims refund
      const initialBalance1 = await token.balanceOf(bettor1.address);
      await prediction.connect(bettor1).claim(1);
      const finalBalance1 = await token.balanceOf(bettor1.address);

      // Bettor2 claims refund
      const initialBalance2 = await token.balanceOf(bettor2.address);
      await prediction.connect(bettor2).claim(1);
      const finalBalance2 = await token.balanceOf(bettor2.address);

      // Check refund distribution
      expect(finalBalance1).to.equal(initialBalance1 + betUnits1 * betAsset.amount);
      expect(finalBalance2).to.equal(initialBalance2 + betUnits2 * betAsset.amount);

      if (isVerbose) {
        console.log("Bets refunded correctly for unresolved prediction after expiry time.");
      }
    });
  });
}
