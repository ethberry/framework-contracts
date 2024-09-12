import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldReleaseFunds(deployLotteryRandomContract: () => Promise<{ lottery: Contract; deployer: SignerWithAddress }>) {
  describe("releaseFunds", function () {
    let lottery: Contract;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      ({ lottery, deployer } = await deployLotteryRandomContract());
    });

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
