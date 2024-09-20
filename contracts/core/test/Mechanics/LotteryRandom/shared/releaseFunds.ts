import { expect } from "chai";
import { ethers, web3 } from "hardhat";
import { formatEther, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { TokenType } from "../../../types";
import { deployERC721 } from "../../../ERC721/shared/fixtures";
import { deployLinkVrfFixture } from "../../../shared/link";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { randomRequest } from "../../../shared/randomRequest";

export function shouldReleaseFunds(factory) {
  describe("releaseFunds", function () {
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

    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const lotteryInstance = await factory();
      const [_, nonAdmin] = await ethers.getSigners();

      const tx = lotteryInstance.connect(nonAdmin).releaseFunds(1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "AccessControlUnauthorizedAccount");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();

      const tx = lotteryInstance.releaseFunds(999);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryZeroBalance", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: TokenType.ERC721,
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: TokenType.NATIVE,
        token: ZeroAddress,
        tokenId: 1n,
        amount: 0n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.releaseFunds(1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryZeroBalance");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
      const lotteryInstance = await factory();
      const [owner] = await ethers.getSigners();
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
      const ticketNumbers = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      await erc721TicketInstance.grantRole("MINTER_ROLE", lotteryInstance);

      await lotteryInstance.printTicket(1, owner, ticketNumbers);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const tx = lotteryInstance.releaseFunds(1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should release funds successfully", async function () {
      const lotteryInstance = await factory();
      const [owner] = await ethers.getSigners();
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
      const ticketNumbers = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      await erc721TicketInstance.grantRole("MINTER_ROLE", lotteryInstance);

      await lotteryInstance.printTicket(1, owner, ticketNumbers);

      await lotteryInstance.endRound();
      await randomRequest(lotteryInstance, vrfInstance);

      const current = await time.latest();
      await time.increaseTo(current.add(web3.utils.toBN(2592000)));

      const tx = lotteryInstance.releaseFunds(1);
      await expect(tx).to.emit(lotteryInstance, "Released").withArgs(1, 1);
    });
  });
}
