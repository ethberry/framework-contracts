import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { deployLotteryRandomContract } from "./fixtures";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    it("should end the current round", async function () {
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Start a new round
      await lottery.connect(admin).startRound(ticket, price, 100);

      // End the current round
      const tx = await lottery.connect(admin).endRound();
      const receipt = await tx.wait();

      const endTimestamp = (await time.latest()).toNumber();

      expect(receipt.events).to.have.lengthOf(1);
      const event = receipt.events[0];
      expect(event.event).to.equal("RoundEnded");
      expect(event.args.round).to.equal(1);
      expect(event.args.endTimestamp).to.equal(endTimestamp);

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.equal(endTimestamp);
    });

    it("should revert if the round is already ended", async function () {
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Start a new round
      await lottery.connect(admin).startRound(ticket, price, 100);

      // End the current round
      await lottery.connect(admin).endRound();

      // Attempt to end the round again
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryRoundNotActive");
    });

    it("should revert if the round is not active", async function () {
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      // Attempt to end a round without starting one
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryWrongRound");
    });
  });
}
