import { formatEther, ZeroAddress } from "ethers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    let lotteryInstance;
    let admin;
    let ticket;
    let price;

    beforeEach(async function () {
      lotteryInstance = await factory();
      [admin] = await ethers.getSigners();

      ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };
    });

    it("should end the current round", async function () {
      // Start a new round
      await lotteryInstance.connect(admin).startRound(ticket, price, 100);

      // End the current round
      const tx = lotteryInstance.connect(admin).endRound();
      const receipt = await (await tx).wait();

      const endTimestamp = (await time.latest()).toNumber();

      expect(receipt.events).to.have.lengthOf(1);
      const event = receipt.events[0];
      expect(event.event).to.equal("RoundEnded");
      expect(event.args.round).to.equal(1);
      expect(event.args.endTimestamp).to.equal(endTimestamp);

      const roundInfo = await lotteryInstance.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.equal(endTimestamp);
    });

    it("should fail: LotteryRoundNotActive", async function () {
      // Start a new round
      await lotteryInstance.connect(admin).startRound(ticket, price, 100);

      // End the current round
      await lotteryInstance.connect(admin).endRound();

      // Attempt to end the round again
      await expect(lotteryInstance.connect(admin).endRound()).to.be.revertedWith("LotteryRoundNotActive");
    });

    it("should fail: LotteryWrongRound", async function () {
      // Attempt to end a round without starting one
      await expect(lotteryInstance.connect(admin).endRound()).to.be.revertedWith("LotteryWrongRound");
    });
  });
}
