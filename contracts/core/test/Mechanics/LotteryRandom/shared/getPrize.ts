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

      await expect(lottery.connect(user).getPrize(0, 1))
        .to.emit(lottery, "Prize")
        .withArgs(user.address, 1, 0, ethers.utils.parseEther("1"));
    });

    it("should revert if the ticket is not a winning ticket", async function () {
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

      const numbers = ethers.utils.formatBytes32String("654321");
      await lottery.printTicket(1, user.address, numbers);

      await lottery.endRound();

      // Simulate Chainlink VRF response
      await randomRequest(lottery, vrfInstance, 123456n);

      await time.increase(2592000); // 30 days

      await expect(lottery.connect(user).getPrize(0, 1)).to.be.revertedWith("LotteryWrongToken");
    });

    it("should revert if the ticket is expired", async function () {
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

      await time.increase(2592000 + 1); // 30 days + 1 second

      await expect(lottery.connect(user).getPrize(0, 1)).to.be.revertedWith("LotteryTicketExpired");
    });

    it("should revert if the caller is not the owner of the ticket", async function () {
      const [owner, user, anotherUser] = await ethers.getSigners();

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

      await expect(lottery.connect(anotherUser).getPrize(0, 1)).to.be.revertedWith("LotteryNotOwnerNorApproved");
    });
  });
}
