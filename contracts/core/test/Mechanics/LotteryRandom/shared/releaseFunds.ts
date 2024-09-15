import { expect } from "chai";
import { formatEther, ZeroAddress } from "ethers";
import { ethers, network } from "hardhat";

export function shouldReleaseFunds(factory) {
  describe("releaseFunds", function () {
    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const lotteryInstance = await factory();
      const [_, nonAdmin] = await ethers.getSigners();
      const tx = lotteryInstance.connect(nonAdmin).releaseFunds(0);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "AccessControlUnauthorizedAccount");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.releaseFunds(999);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryZeroBalance", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.releaseFunds(0);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryZeroBalance");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);
      const tx = lotteryInstance.releaseFunds(1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should release funds successfully", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();

      // Simulate the passage of time to exceed the time lag
      await ethers.provider.send("evm_increaseTime", [2592000]);
      await ethers.provider.send("evm_mine", []);

      const tx = lotteryInstance.releaseFunds(1);
      await expect(tx).to.emit(lotteryInstance, "Released").withArgs(1, price.amount);
    });
  });
}
