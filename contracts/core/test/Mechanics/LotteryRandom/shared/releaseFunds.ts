import { expect } from "chai";
import { ethers, network } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { TokenType } from "@gemunion/types-blockchain";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { randomRequest } from "../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../shared/link";

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

      const lottery = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lottery.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lottery.address);

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lottery.printTicket(1, user.address, numbers);

      await lottery.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lottery, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await expect(lottery.releaseFunds(1))
        .to.emit(lottery, "Released")
        .withArgs(1, ethers.utils.parseEther("1"));
    });

    it("should revert if the round is not complete", async function () {
      const [owner, user] = await ethers.getSigners();

      const lottery = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lottery.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lottery.address);

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lottery.printTicket(1, user.address, numbers);

      await lottery.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lottery, vrfInstance, 123456n);

      await expect(lottery.releaseFunds(1)).to.be.revertedWith("LotteryRoundNotComplete");
    });

    it("should revert if the round has no balance", async function () {
      const [owner, user] = await ethers.getSigners();

      const lottery = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lottery.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lottery.address);

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lottery.printTicket(1, user.address, numbers);

      await lottery.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lottery, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await lottery.releaseFunds(1);

      await expect(lottery.releaseFunds(1)).to.be.revertedWith("LotteryZeroBalance");
    });

    it("should revert if the round number is invalid", async function () {
      const [owner, user] = await ethers.getSigners();

      const lottery = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: TokenType.ERC20,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Set subscription ID
      await lottery.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lottery.address);

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      await lottery.printTicket(1, user.address, numbers);

      await lottery.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lottery, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await expect(lottery.releaseFunds(2)).to.be.revertedWith("LotteryWrongRound");
    });
  });
}
