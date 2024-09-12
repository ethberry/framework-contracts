import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function shouldPrintTicket(deployLotteryRandomContract: () => Promise<{ lottery: Contract; deployer: SignerWithAddress }>) {
  describe("printTicket", function () {
    let lottery: Contract;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      ({ lottery, deployer } = await deployLotteryRandomContract());
    });

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
}
