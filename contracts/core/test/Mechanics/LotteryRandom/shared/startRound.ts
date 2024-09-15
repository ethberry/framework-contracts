import { expect } from "chai";
import { ethers } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";

export function shouldStartRound(factory) {
  describe("startRound", function () {

    it.only("should start a new round with valid ERC721 ticket asset", async function () {
      const lotteryInstance = await factory();

      const roundId = 1n;
      const maxTicket = 100n;

      const ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const startTimestamp = (await time.latest()).toNumber() + 1;
      const tx = lotteryInstance.startRound(ticket, price, 100);

      await expect(tx)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          roundId,
          ethers.toQuantity(startTimestamp),
          maxTicket,
          isEqualEventArgObj(ticket),
          isEqualEventArgObj(price),
        );

      const roundInfo = await lotteryInstance.getCurrentRoundInfo();

      expect(roundInfo.roundId).to.equal(1);
      expect(roundInfo.maxTicket).to.equal(100);
    });

    it("should fail: WrongAsset", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: 1,
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const tx = lotteryInstance.startRound(ticket, price, 100);
      await expect(tx).to.be.revertedWith("WrongAsset");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
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
        amount: ethers.parseEther("1"),
      };

      // Start the first round
      await lotteryInstance.startRound(ticket, price, 100);

      // Attempt to start another round without ending the previous one
      const tx = lotteryInstance.startRound(ticket, price, 100);
      await expect(tx).to.be.revertedWith("LotteryRoundNotComplete");
    });

    it("should fail: AccessControl: account is missing role", async function () {
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
        amount: ethers.parseEther("1"),
      };

      // Attempt to start a round with a non-admin account
      const tx = lotteryInstance.connect(nonAdmin).startRound(ticket, price, 100);
      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${ethers.id("DEFAULT_ADMIN_ROLE")}`
      );
    });
  });
}
