import { expect } from "chai";
import { formatEther, ZeroAddress } from "ethers";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { deployERC721 } from "../../../ERC721/shared/fixtures";
import { getNumbersBytes } from "../../../utils";
import { MINTER_ROLE } from "@gemunion/contracts-constants";
import { TokenType } from "../../../types";

export function shouldGetPrize(factory) {
  describe("getPrize", function () {
    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.getPrize(1, 999);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
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
      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: LotteryTicketExpired", async function () {
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
      await lotteryInstance.endRound();
      await time.increase(2592001); // Increase time beyond the time lag
      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketExpired");
    });

    it("should fail: LotteryNotOwnerNorApproved", async function () {
      const lotteryInstance = await factory();
      const [_, nonOwner] = await ethers.getSigners();
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
      await lotteryInstance.endRound();
      const tx = lotteryInstance.connect(nonOwner).getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryNotOwnerNorApproved");
    });

    it("should fail: LotteryWrongToken", async function () {
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
      await lotteryInstance.endRound();
      const tx = lotteryInstance.getPrize(999, 1); // Invalid tokenId
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
    });

    it("should get prize successfully", async function () {
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
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();
      await lotteryInstance.fulfillRandomWords(1, [123456789]);
      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize");
    });
  });
}
