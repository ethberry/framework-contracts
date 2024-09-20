import { expect } from "chai";
import { ethers, network } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { deployLinkVrfFixture } from "../../../shared/link";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { amount, DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce, PAUSER_ROLE } from "@gemunion/contracts-constants";
import { randomRequest } from "../../../shared/randomRequest";
import { TokenType } from "../../../types";
import { getNumbersBytes } from "../../../utils";
import { deployERC721 } from "../../../ERC721/shared/fixtures";

export function shouldGetPrize(factory) {
  describe.only("getPrize", function () {
    let vrfInstance;
    let subId;

    before(async function () {
      await network.provider.send("hardhat_reset");

      ({ vrfInstance, subId } = await loadFixture(function exchange() {
        return deployLinkVrfFixture();
      }));
    });

    after(async function () {
      await network.provider.send("hardhat_reset");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");
      
      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance,
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

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      const [_owner, receiver] = await ethers.getSigners();
      await lotteryInstance.printTicket(1, receiver, ticketNumbers);
      
      const tx = lotteryInstance.getPrize(1n, 0n);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: LotteryNotOwnerNorApproved", async function () {
      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");
      
      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance,
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

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      const [_owner, receiver] = await ethers.getSigners();
      await lotteryInstance.printTicket(1, receiver, ticketNumbers);

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);
      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const [_, nonOwner] = await ethers.getSigners();
      const tx = lotteryInstance.connect(nonOwner).getPrize(1, 0);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryNotOwnerNorApproved");
    });

    it("should fail: LotteryWrongToken", async function () {
      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");
      
      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance,
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

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      const [_owner, receiver] = await ethers.getSigners();
      await lotteryInstance.printTicket(1, receiver, ticketNumbers);

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);
      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.getPrize(2, 0);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
    });

    it("should get the prize successfully", async function () {
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

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);
      await lotteryInstance.printTicket(1, receiver, ticketNumbers);

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);
      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.getPrize(1, 0);
      await expect(tx).to.emit(lotteryInstance, "Prize").withArgs(receiver, 0, 1, formatEther(1));
    });
  });
}
