import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldEndRound(deployLotteryRandomContract: () => Promise<{ lottery: Contract; deployer: SignerWithAddress }>) {
  describe("endRound", function () {
    let lottery: Contract;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      ({ lottery, deployer } = await deployLotteryRandomContract());
    });

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
}
