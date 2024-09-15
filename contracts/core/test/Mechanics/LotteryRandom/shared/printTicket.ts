import { expect } from "chai";
import { ethers } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";
import { expiresAt, externalId, params, templateId, tokenId, amount } from "../../../constants";
import { TokenType } from "../../../types";

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
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId,
        amount,
      };

      await lotteryInstance.startRound(ticket, price, 1);

      await lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      const tx = lotteryInstance.printTicket(2, ZeroAddress, "0x5678");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketLimitExceed");
    });

    it("should print a ticket successfully", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const lotteryInstance = await factory();
      const erc721TicketInstance = await ethers.getContractFactory("ERC721LotteryTicket");
      const erc721Instance = await erc721TicketInstance.deploy();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: await erc721Instance.getAddress(),
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [1, 2, 3, 4, 5, 6];
      const ticketNumbers = getNumbersBytes(values);

      const tx = lotteryInstance.printTicket(1, receiver.address, ticketNumbers);

      await expect(tx)
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, tokenId);

      const newTicketId = await erc721Instance.ownerOf(tokenId);
      expect(newTicketId).to.equal(receiver.address);
    });
  });
}
