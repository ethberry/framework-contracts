import { formatEther } from "ethers";
import { formatEther, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    it("should end the current round", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      // Start the first round
      await lotteryInstance.startRound(ticket, price, 100);

      // End the current round
      const tx = lotteryInstance.endRound();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded");

      const roundInfo = await lotteryInstance.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.be.gt(0);
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();

      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryRoundNotActive", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      // Start the first round
      await lotteryInstance.startRound(ticket, price, 100);

      // End the current round
      await lotteryInstance.endRound();

      // Attempt to end the round again
      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotActive");
    });

    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const lotteryInstance = await factory();
      const [_, nonAdmin] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };

      // Start the first round
      await lotteryInstance.startRound(ticket, price, 100);

      // Attempt to end the round with a non-admin account
      const tx = lotteryInstance.connect(nonAdmin).endRound();
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "AccessControlUnauthorizedAccount");
    });
  });
}
