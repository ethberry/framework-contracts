import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldGetPrize(deployLotteryRandomContract: () => Promise<{ lottery: Contract; deployer: SignerWithAddress }>) {
  describe("getPrize", function () {
    let lottery: Contract;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      ({ lottery, deployer } = await deployLotteryRandomContract());
    });

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
}
