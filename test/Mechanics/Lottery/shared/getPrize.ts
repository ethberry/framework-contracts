import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { MINTER_ROLE } from "@ethberry/contracts-constants";

import { VRFCoordinatorV2PlusMock } from "../../../../typechain-types";
import { deployLinkVrfFixture } from "../../../shared/link";
import { randomRequest } from "../../../shared/randomRequest";
import { TokenType } from "../../../types";
import { getNumbersBytes } from "../../../utils";
import { deployERC721 } from "../../../ERC721/shared/fixtures";
import { amount, price } from "../constants";

export function shouldGetPrize(factory: () => Promise<any>) {
  describe("getPrize", function () {
    let vrfInstance: VRFCoordinatorV2PlusMock;
    let subId: bigint;

    before(async function () {
      await network.provider.send("hardhat_reset");

      ({ vrfInstance, subId } = await loadFixture(function exchange() {
        return deployLinkVrfFixture();
      }));
    });

    after(async function () {
      await network.provider.send("hardhat_reset");
    });

    it("should get the prize successfully", async function () {
      const [owner] = await ethers.getSigners();

      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance.target,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [29, 15, 27, 14, 31, 19];
      const ticketNumbers = getNumbersBytes(values);

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);
      await lotteryInstance.printTicket(1, owner, ticketNumbers, price, { value: amount });

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize").withArgs(owner, 1, 1, 22000);
    });

    it("should fail: LotteryWrongToken", async function () {
      const [owner] = await ethers.getSigners();

      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [1, 2, 3, 4, 5, 6];
      const ticketNumbers = getNumbersBytes(values);

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      await lotteryInstance.printTicket(1, owner, ticketNumbers, price, { value: amount });

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
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

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [1, 2, 3, 4, 5, 6];
      const ticketNumbers = getNumbersBytes(values);

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      const [_owner, receiver] = await ethers.getSigners();
      await lotteryInstance.printTicket(1, receiver, ticketNumbers, price, { value: amount });

      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: LotteryNotOwnerNorApproved", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const lotteryInstance = await factory();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const ticket = {
        tokenType: TokenType.ERC721,
        token: erc721TicketInstance,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const values = [29, 15, 27, 14, 31, 19];
      const ticketNumbers = getNumbersBytes(values);

      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance);

      await lotteryInstance.printTicket(1, owner, ticketNumbers, price, { value: amount });

      await lotteryInstance.setSubscriptionId(subId);
      await vrfInstance.addConsumer(subId, lotteryInstance.target);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.connect(receiver).getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryNotOwnerNorApproved");
    });
  });
}
