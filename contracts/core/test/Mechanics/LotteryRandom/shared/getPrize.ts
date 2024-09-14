import { formatBytes32String, parseEther, ZeroAddress } from "ethers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { TokenType } from "@gemunion/types-blockchain";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { randomRequest } from "../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../shared/link";

export function shouldGetPrize(factory) {
  describe("getPrize", function () {
    let vrfInstance;
    let subId;

    before(async function () {
      await network.provider.send("hardhat_reset");

      ({ vrfInstance, subId } = await loadFixture(deployLinkVrfFixture));
    });

    after(async function () {
      await network.provider.send("hardhat_reset");
    });

    it("should get prize for a winning ticket", async function () {
      const [owner, user] = await ethers.getSigners();

      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId: 0,
        amount: parseEther("1"),
      };

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = formatBytes32String("123456");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await time.increase(2592000);

      await expect(lotteryInstance.connect(user).getPrize(0, 1))
        .to.emit(lotteryInstance, "Prize")
        .withArgs(user.address, 1, 0, parseEther("1"));
    });

    it("should fail: LotteryWrongToken", async function () {
      const [owner, user] = await ethers.getSigners();

      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId: 0,
        amount: parseEther("1"),
      };

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = formatBytes32String("654321");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await time.increase(2592000);

      const tx = lotteryInstance.connect(user).getPrize(0, 1);
      await expect(tx).to.be.revertedWith("LotteryWrongToken");
    });

    it("should fail: LotteryTicketExpired", async function () {
      const [owner, user] = await ethers.getSigners();

      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId: 0,
        amount: parseEther("1"),
      };

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = formatBytes32String("123456");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await time.increase(2592000 + 1);

      const tx = lotteryInstance.connect(user).getPrize(0, 1);
      await expect(tx).to.be.revertedWith("LotteryTicketExpired");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
      const [owner, user] = await ethers.getSigners();

      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };
