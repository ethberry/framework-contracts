```typescript
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { TokenType } from "@gemunion/types-blockchain";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { randomRequest } from "../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../shared/link";
import { formatEther, ZeroAddress } from "ethers";

export function shouldReleaseFunds(factory) {
  describe("releaseFunds", function () {
    let vrfInstance;
    let subId;

    before(async function () {
      await network.provider.send("hardhat_reset");

      ({ vrfInstance, subId } = await loadFixture(deployLinkVrfFixture));
    });

    after(async function () {
      await network.provider.send("hardhat_reset");
    });

    it("should release funds after the round is complete", async function () {
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
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await expect(lotteryInstance.releaseFunds(1))
        .to.emit(lotteryInstance, "Released")
        .withArgs(1, ethers.utils.parseEther("1"));
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

      const price = {
        tokenType: TokenType.ERC20,
        token: ZeroAddress,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await expect(lotteryInstance.releaseFunds(1)).to.be.revertedWith("LotteryRoundNotComplete");
    });

    it("should fail: LotteryZeroBalance", async function () {
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
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.address);

      await lotteryInstance.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lotteryInstance.printTicket(1, user.address, numbers);

      await lotteryInstance.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lotteryInstance, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await lotteryInstance.releaseFunds(1);

      await expect(lotteryInstance.releaseFunds(1)).to.be.revertedWith("LotteryZeroBalance");
    });

    it("should fail: LotteryWrongRound", async function () {
      const [owner, user] = await ethers.getSigners();

      const lotteryInstance = await factory();

      await expect
