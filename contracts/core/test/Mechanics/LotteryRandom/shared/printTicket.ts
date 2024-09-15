import { expect } from "chai";
import { formatEther } from "ethers";
import { ethers } from "hardhat";

export function shouldPrintTicket(factory) {
  describe("printTicket", function () {
    it("should print ticket successfully", async function () {
      const lotteryInstance = await factory();
      const [owner, account] = await ethers.getSigners();
      const externalId = 1;
      const numbers = ethers.utils.formatBytes32String("123456");

      await lotteryInstance.startRound(
        { tokenType: 1, token: account.address, amount: 0 },
        { tokenType: 2, token: account.address, amount: 100 },
        100
      );

      const tx = lotteryInstance.printTicket(externalId, account.address, numbers);
      await expect(tx).to.emit(lotteryInstance, "RoundStarted");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const [owner, account] = await ethers.getSigners();
      const externalId = 1;
      const numbers = ethers.utils.formatBytes32String("123456");

      const tx = lotteryInstance.printTicket(externalId, account.address, numbers);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryTicketLimitExceed", async function () {
      const lotteryInstance = await factory();
      const [owner, account] = await ethers.getSigners();
      const externalId = 1;
      const numbers = ethers.utils.formatBytes32String("123456");

      await lotteryInstance.startRound(
        { tokenType: 1, token: account.address, amount: 0 },
        { tokenType: 2, token: account.address, amount: 100 },
        1
      );

      await lotteryInstance.printTicket(externalId, account.address, numbers);

      const tx = lotteryInstance.printTicket(externalId, account.address, numbers);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketLimitExceed");
    });
  });
}
