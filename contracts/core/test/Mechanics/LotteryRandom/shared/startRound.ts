import { expect } from "chai";
import { ethers } from "hardhat";
import { amount, tokenId, nonce, PAUSER_ROLE } from "@gemunion/contracts-constants";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";

export function shouldStartRound(factory) {
  describe("startRound", function () {
    it.only("should start a new round", async function () {
			const lottery = await factory();
			
      const ticket = {
        tokenType: 2,
        token: ethers.ZeroAddress,
        tokenId,
        amount: 0,
      };
      const price = {
        tokenType: 1,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };

      const current: number = (await time.latest()).toNumber();
      await expect(tx)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          1n,
          ethers.toQuantity(current),
          0n,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.roundId).to.equal(1);
      expect(roundInfo.maxTicket).to.equal(100);
    });
  });
}
