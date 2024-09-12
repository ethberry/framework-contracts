import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldStartRound(factory) {
  describe("startRound", function () {
    it.only("should start a new round", async function () {
			const lottery = await factory();
			
      const ticket = {
        tokenType: 1,
        token: ethers.ZeroAddress,
        tokenId: 0,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.ZeroAddress,
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
}
