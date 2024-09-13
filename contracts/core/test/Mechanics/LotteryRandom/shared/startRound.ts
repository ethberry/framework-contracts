import { expect } from "chai";
import { ethers } from "hardhat";
import { amount, tokenId, nonce, PAUSER_ROLE } from "@gemunion/contracts-constants";
import { time } from "@openzeppelin/test-helpers";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../../utils";

export function shouldStartRound(factory) {
  describe("startRound", function () {
		it("should start a new round with valid ERC721 ticket asset", async function () {
			const lottery = await factory();

			const roundId = 1n;
			const maxTicket = 0n;
			
      const ticket = {
        tokenType: 2,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };
      const price = {
        tokenType: 1,
        token: ethers.ZeroAddress,
        tokenId,
        amount,
      };

      const startTimestamp = (await time.latest()).toNumber();
      await expect(tx)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          roundId,
          ethers.toQuantity(startTimestamp),
          maxTicket,
          isEqualEventArgObj(ticket),
          isEqualEventArgObj(price),
        );

      const roundInfo = await lottery.getCurrentRoundInfo();

      expect(roundInfo.roundId).to.equal(1);
      expect(roundInfo.maxTicket).to.equal(100);
    });

	  it("should revert if ticket asset is not ERC721", async function () {
	    const lottery = await factory();

	    const ticket = {
	      tokenType: TokenType.ERC20,
	      token: ethers.constants.AddressZero,
	      tokenId,
	      amount,
	    };

	    const price = {
	      tokenType: TokenType.ERC20,
	      token: ethers.constants.AddressZero,
	      tokenId,
	      amount,
	    };

	    await expect(lottery.connect(admin).startRound(ticket, price, 100)).to.be.revertedWith("WrongAsset");
	  });

	  it("should fail: LotteryRoundNotComplete", async function () {
	    const { lottery, admin } = await deployLotteryRandomContract();

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

	    // Start the first round
	    await lottery.connect(admin).startRound(ticket, price, 100);

	    // Attempt to start another round without ending the previous one
	    await expect(lottery.connect(admin).startRound(ticket, price, 100)).to.be.revertedWith("LotteryRoundNotComplete");
	  });
  });
}
