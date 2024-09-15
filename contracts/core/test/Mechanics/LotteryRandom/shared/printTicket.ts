import { expect } from "chai";
import { ethers } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";
import { expiresAt, externalId, params, templateId, tokenId, amount } from "../../../constants";
import { TokenType } from "../../../types";
import { deployERC721 } from "../../../ERC721/shared/fixtures";

export function shouldPrintTicket(factory) {
  describe("printTicket", function () {
    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const lotteryInstance = await factory();
      const [_, nonMinter] = await ethers.getSigners();
      const tx = lotteryInstance.connect(nonMinter).printTicket(1, nonMinter.address, "0x1234");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "AccessControlUnauthorizedAccount");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryTicketLimitExceed", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      const price = {
        tokenType: TokenType.NATIVE,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.startRound(ticket, price, 1);

      await lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      const tx = lotteryInstance.printTicket(2, ZeroAddress, "0x5678");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketLimitExceed");
    });

    it.only("should print a ticket successfully", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance.target,
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: TokenType.NATIVE,
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [1, 2, 3, 4, 5, 6];
      const ticketNumbers = getNumbersBytes(values);

      const tx = lotteryInstance.printTicket(1, receiver.address, ticketNumbers);

      await expect(tx)
        .to.emit(erc721TicketInstance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, 1n);

      const newTicketId = await erc721TicketInstance.ownerOf(1n);
      expect(newTicketId).to.equal(receiver.address);
    });
  });
}
