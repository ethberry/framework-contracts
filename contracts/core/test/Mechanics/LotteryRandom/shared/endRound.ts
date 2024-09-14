Certainly! I've updated and improved the test script for the `endRound` function in the `LotteryRandom` contract. This script ensures full correctness and coverage, including the specified reverting test cases.

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { formatEther, ZeroAddress } from "ethers";
import { deployLotteryRandomContract } from "./fixtures";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    let lottery;
    let admin;
    let ticket;
    let price;

    beforeEach(async function () {
      lottery = await factory();
      [admin] = await ethers.getSigners();

      ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };
    });

    it("should end the current round", async function () {
      // Start a new round
      await lottery.connect(admin).startRound(ticket, price, 100);

      // End the current round
      const tx = await lottery.connect(admin).endRound();
      const receipt = await tx.wait();

      const endTimestamp = (await time.latest()).toNumber();

      expect(receipt.events).to.have.lengthOf(1);
      const event = receipt.events[0];
      expect(event.event).to.equal("RoundEnded");
      expect(event.args.round).to.equal(1);
      expect(event.args.endTimestamp).to.equal(endTimestamp);

      const roundInfo = await lottery.getCurrentRoundInfo();
      expect(roundInfo.endTimestamp).to.equal(endTimestamp);
    });

    it("should fail: LotteryRoundNotActive", async function () {
      // Start a new round
      await lottery.connect(admin).startRound(ticket, price, 100);

      // End the current round
      await lottery.connect(admin).endRound();

      // Attempt to end the round again
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryRoundNotActive");
    });

    it("should fail: LotteryWrongRound", async function () {
      // Attempt to end a round without starting one
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryWrongRound");
    });
  });
}
```

### Explanation:
1. **Setup**: The `beforeEach` hook is used to set up common variables before each test case runs. This includes deploying the contract and defining the `ticket` and `price` assets.
2. **Test Cases**: 
   - **Successful End Round**: The test starts a new round and then ends it, checking that the `RoundEnded` event is emitted and that the `endTimestamp` is correctly updated.
   - **Reverting Cases**: 
     - "should fail: LotteryRoundNotActive": Ensures that trying to end a round that has already ended results in a revert with the `LotteryRoundNotActive` error.
     - "should fail: LotteryWrongRound": Ensures that trying to end a round without starting one results in a revert with the `LotteryWrongRound` error.

By following this structure, the test script ensures comprehensive coverage of the `endRound` function, including all necessary edge cases and correct error handling.
