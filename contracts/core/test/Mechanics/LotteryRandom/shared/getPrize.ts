import { formatEther, ZeroAddress } from "ethers";

export function shouldGetPrize(factory) {
  describe("getPrize", function () {
    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.getPrize(1, 999);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryRoundNotComplete", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: LotteryTicketExpired", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();
      await time.increase(2592001); // Increase time beyond the time lag
      const tx = lotteryInstance.getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketExpired");
    });

    it("should fail: LotteryNotOwnerNorApproved", async function () {
      const lotteryInstance = await factory();
      const [_, nonOwner] = await ethers.getSigners();
      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();
      const tx = lotteryInstance.connect(nonOwner).getPrize(1, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryNotOwnerNorApproved");
    });

    it("should fail: LotteryWrongToken", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();
      const tx = lotteryInstance.getPrize(999, 1); // Invalid tokenId
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
    });

    it("should get prize successfully", async function () {
      const lotteryInstance = await factory();
      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: 1n,
      };
      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 0n,
        amount: formatEther("1"),
      };
      await lotteryInstance.startRound(ticket, price, 100);
      await lotteryInstance.endRound();
      await lotteryInstance.fulfillRandomWords(1, [123456789]); // Mock random number
      const tx = await lotteryInstance.getPrize(1, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize");
    });
  });
}
