import { expect } from "chai";
import { ethers } from "hardhat";
import { amount, tokenId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { formatEther, ZeroAddress } from "ethers";
import { getNumbersBytes } from "../../../utils";

export function shouldPrintTicket(factory) {
  describe("printTicket", function () {
    it("should print a ticket successfully", async function () {
      const lotteryInstance = await factory();
      const [admin, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2,
        token: ZeroAddress,
        tokenId,
        amount,
      };
      const price = {
        tokenType: 1,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.connect(admin).startRound(ticket, price, 100);

      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);
      const externalId = 1;

      await lotteryInstance.connect(admin).grantRole(MINTER_ROLE, admin.address);

      await expect(lotteryInstance.connect(admin).printTicket(externalId, user.address, numbers))
        .to.emit(lotteryInstance, "TicketPrinted")
        .withArgs(1, user.address, externalId, numbers);

      const roundInfo = await lotteryInstance.getCurrentRoundInfo();
      expect(roundInfo.tickets.length).to.equal(1);
    });

    it("should fail: LotteryTicketLimitExceed", async function () {
      const lotteryInstance = await factory();
      const [admin, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2,
        token: ZeroAddress,
        tokenId,
        amount,
      };
      const price = {
        tokenType: 1,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.connect(admin).startRound(ticket, price, 1);

      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);
      const externalId = 1;

      await lotteryInstance.connect(admin).grantRole(MINTER_ROLE, admin.address);

      await lotteryInstance.connect(admin).printTicket(externalId, user.address, numbers);

      const tx = lotteryInstance.connect(admin).printTicket(externalId, user.address, numbers);
      await expect(tx).to.be.revertedWith("LotteryTicketLimitExceed");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const [owner, minter, user] = await ethers.getSigners();

      await lotteryInstance.grantRole(MINTER_ROLE, minter.address);

      const ticket = {
        tokenType: 2,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      const price = {
        tokenType: 1,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      await lotteryInstance.endRound();

      const externalId = 1;
      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);

      const tx = lotteryInstance.connect(minter).printTicket(externalId, user.address, numbers);
      await expect(tx).to.be.revertedWith("LotteryWrongRound");
    });

    it("should fail: AccessControl", async function () {
      const lotteryInstance = await factory();
      const [owner, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      const price = {
        tokenType: 1,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const externalId = 1;
      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);

      const tx = lotteryInstance.connect(user).printTicket(externalId, user.address, numbers);
      await expect(tx).to.be.revertedWith(`AccessControl: account ${user.address.toLowerCase()} is missing role ${MINTER_ROLE}`);
    });
  });
}

