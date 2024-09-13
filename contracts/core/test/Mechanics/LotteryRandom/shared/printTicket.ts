import { expect } from "chai";
import { ethers } from "hardhat";
import { amount, tokenId, nonce, MINTER_ROLE } from "@gemunion/contracts-constants";
import { time } from "@openzeppelin/test-helpers";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";

export function shouldPrintTicket(factory) {
  describe("printTicket", function () {
    it("should print a ticket successfully", async function () {
      const lottery = await factory();
      const [admin, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };
      const price = {
        tokenType: 1,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };

      await lottery.connect(admin).startRound(ticket, price, 100);

      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);
      const externalId = 1;

      await lottery.connect(admin).grantRole(MINTER_ROLE, admin.address);

      const tx = await lottery.connect(admin).printTicket(externalId, user.address, numbers);

      await expect(tx)
        .to.emit(lottery, "TicketPrinted")
        .withArgs(1, user.address, externalId, numbers);

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.tickets.length).to.equal(1);
    });

    it("should revert if max tickets limit is exceeded", async function () {
      const lottery = await factory();
      const [admin, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };
      const price = {
        tokenType: 1,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };

      await lottery.connect(admin).startRound(ticket, price, 1);

      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);
      const externalId = 1;

      await lottery.connect(admin).grantRole(MINTER_ROLE, admin.address);

      await lottery.connect(admin).printTicket(externalId, user.address, numbers);

      await expect(
        lottery.connect(admin).printTicket(externalId, user.address, numbers)
      ).to.be.revertedWith("LotteryTicketLimitExceed");
    });

    it("should revert if round is not active", async function () {
      const lottery = await factory();
      const [owner, minter, user] = await ethers.getSigners();

      // Grant MINTER_ROLE to minter
      await lottery.grantRole(MINTER_ROLE, minter.address);

      const ticket = {
        tokenType: 2, // ERC721
        token: ethers.constants.AddressZero,
        tokenId,
        amount,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ethers.constants.AddressZero,
        tokenId,
        amount,
      };

      // Start a new round
      await lottery.startRound(ticket, price, 100);

      // End the round
      await lottery.endRound();

      const externalId = 1;
      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);

      // Attempt to print a ticket after round has ended
      await expect(lottery.connect(minter).printTicket(externalId, user.address, numbers)).to.be.revertedWith(
        "LotteryWrongRound"
      );
    });


    it("should revert if not called by minter", async function () {
      const lottery = await factory();
      const [owner, user] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721
        token: ethers.constants.AddressZero,
        tokenId,
        amount,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ethers.constants.AddressZero,
        tokenId,
        amount,
      };

      // Start a new round
      await lottery.startRound(ticket, price, 100);

      const externalId = 1;
      const numbers = getNumbersBytes([1, 2, 3, 4, 5, 6]);

      // Attempt to print a ticket without MINTER_ROLE
      await expect(lottery.connect(user).printTicket(externalId, user.address, numbers)).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${MINTER_ROLE}`
      );
    });
  });
}
