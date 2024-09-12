import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldBehaveLikeLotteryRandom(deployLotteryRandomContract: () => Promise<{ lottery: Contract; deployer: SignerWithAddress }>) {
  let lottery: Contract;
  let deployer: SignerWithAddress;

  beforeEach(async function () {
    ({ lottery, deployer } = await deployLotteryRandomContract());
  });

  describe("startRound", function () {
    it("should start a new round", async function () {
      const ticket = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("0.1"),
      };

      await expect(lottery.startRound(ticket, price, 100))
        .to.emit(lottery, "RoundStarted")
        .withArgs(1, await ethers.provider.getBlockNumber(), 100, ticket, price);

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.roundId).to.equal(1);
      expect(roundInfo.maxTicket).to.equal(100);
    });
  });

  describe("endRound", function () {
    it("should end the current round", async function () {
      const ticket = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("0.1"),
      };

      await lottery.startRound(ticket, price, 100);
      await expect(lottery.endRound())
        .to.emit(lottery, "RoundEnded")
        .withArgs(1, await ethers.provider.getBlockNumber());

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.be.gt(0);
    });
  });

  describe("printTicket", function () {
    it("should print a new ticket", async function () {
      const ticket = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("0.1"),
      };

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      const externalId = 1;

      await expect(lottery.printTicket(externalId, deployer.address, numbers))
        .to.emit(lottery, "Transfer")
        .withArgs(ethers.constants.AddressZero, deployer.address, 1);

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.tickets.length).to.equal(1);
    });
  });

  describe("getPrize", function () {
    it("should get the prize for a winning ticket", async function () {
      const ticket = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("0.1"),
      };

      await lottery.startRound(ticket, price, 100);

      const numbers = ethers.utils.formatBytes32String("123456");
      const externalId = 1;

      await lottery.printTicket(externalId, deployer.address, numbers);

      await lottery.endRound();

      const roundInfo = await lottery.getCurrentRoundInfo();
      const winValues = roundInfo.values;

      await expect(lottery.getPrize(1, 1))
        .to.emit(lottery, "Prize")
        .withArgs(deployer.address, 1, 1, ethers.utils.parseEther("0.1"));

      const updatedRoundInfo = await lottery.getCurrentRoundInfo();
      expect(updatedRoundInfo.balance).to.be.lt(roundInfo.balance);
    });
  });

  describe("releaseFunds", function () {
    it("should release the funds of a round", async function () {
      const ticket = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.constants.AddressZero,
        tokenId: 0,
        amount: ethers.utils.parseEther("0.1"),
      };

      await lottery.startRound(ticket, price, 100);
      await lottery.endRound();

      const roundInfo = await lottery.getCurrentRoundInfo();
      const initialBalance = roundInfo.balance;

      await expect(lottery.releaseFunds(1))
        .to.emit(lottery, "Released")
        .withArgs(1, initialBalance);

      const updatedRoundInfo = await lottery.getCurrentRoundInfo();
      expect(updatedRoundInfo.balance).to.equal(0);
    });
  });
}
