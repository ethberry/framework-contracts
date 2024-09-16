import { expect } from "chai";
import { ethers } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { deployLinkVrfFixture } from "../../../shared/link";
import { randomRequest } from "../../../shared/randomRequest";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    let vrfInstance;
    let subId;

    before(async function () {
      ({ vrfInstance, subId } = await loadFixture(deployLinkVrfFixture));
    });

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

      await lotteryInstance.startRound(ticket, price, 100);

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);

      const tx = lotteryInstance.endRound();
      const currentTimestamp = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, currentTimestamp);

      const roundInfo = await lotteryInstance.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.be.gte(currentTimestamp);

      await randomRequest(lotteryInstance, vrfInstance);
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

      // Set VRFV2 Subscription
      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);

      // End the current round
      await lotteryInstance.endRound();

      // Attempt to end the round again
      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotActive");
    });
  });
}
```
