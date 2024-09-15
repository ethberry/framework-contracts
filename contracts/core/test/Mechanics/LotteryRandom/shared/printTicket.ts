import { formatEther, ZeroAddress } from "ethers";

export function shouldPrintTicket(factory) {
  describe("printTicket", function () {
    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const lotteryInstance = await factory();
      const [_, nonMinter] = await ethers.getSigners();
      const tx = lotteryInstance.connect(nonMinter).printTicket(1, nonMinter.address, "0x1234");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "AccessControlUnauthorizedAccount");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lotteryInstance = await factory();
      const tx = lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: LotteryTicketLimitExceed", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 1);

      await lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      const tx = lotteryInstance.printTicket(2, ZeroAddress, "0x5678");
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketLimitExceed");
    });

    it("should print a ticket successfully", async function () {
      const lotteryInstance = await factory();

      const ticket = {
        tokenType: 2, // ERC721 TokenType
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      const price = {
        tokenType: 1, // ERC20 TokenType
        token: ZeroAddress,
        tokenId: 1n,
        amount: 1n,
      };

      await lotteryInstance.startRound(ticket, price, 100);

      const tx = await lotteryInstance.printTicket(1, ZeroAddress, "0x1234");
      await expect(tx).to.emit(lotteryInstance, "Transfer"); // Assuming the mintTicket function emits a Transfer event
    });
  });
}
