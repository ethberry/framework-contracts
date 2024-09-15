import { formatEther } from "ethers";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    it("should end the round successfully", async function () {
      const lotteryInstance = await factory();
      await lotteryInstance.startRound({ tokenType: 1, token: "0x123" }, { tokenType: 1, token: "0x456" }, 100);
      const tx = lotteryInstance.endRound();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWith("LotteryWrongRound");
    });

    it("should fail: LotteryRoundNotActive", async function () {
      const lotteryInstance = await factory();
      await lotteryInstance.startRound({ tokenType: 1, token: "0x123" }, { tokenType: 1, token: "0x456" }, 100);
      await lotteryInstance.endRound();
      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWith("LotteryRoundNotActive");
    });

    it("should fail: Ownable: caller is not the owner", async function () {
      const lotteryInstance = await factory();
      const [_, addr1] = await ethers.getSigners();
      await lotteryInstance.startRound({ tokenType: 1, token: "0x123" }, { tokenType: 1, token: "0x456" }, 100);
      const tx = lotteryInstance.connect(addr1).endRound();
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
}
