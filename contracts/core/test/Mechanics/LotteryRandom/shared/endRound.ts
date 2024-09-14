Certainly! Below is the improved test script for the `endRound` function in the `LotteryRandom` contract, ensuring full correctness and coverage for the method. The test cases include proper naming for reverting test cases as specified.

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { formatEther, ZeroAddress } from "ethers";
import { deployLotteryRandomContract } from "./fixtures";

export function shouldEndRound(factory) {
  describe("endRound", function () {
    it("should end the current round", async function () {
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

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
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      const ticket = {
        tokenType: 2, // ERC721
        token: ZeroAddress,
        tokenId: 0,
        amount: 1,
      };

      const price = {
        tokenType: 1, // ERC20
        token: ZeroAddress,
        tokenId: 0,
        amount: ethers.utils.parseEther("1"),
      };

      // Start a new round
      await lottery.connect(admin).startRound(ticket, price, 100);

      // End the current round
      await lottery.connect(admin).endRound();

      // Attempt to end the round again
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryRoundNotActive");
    });

    it("should fail: LotteryWrongRound", async function () {
      const lottery = await factory();
      const [admin] = await ethers.getSigners();

      // Attempt to end a round without starting one
      await expect(lottery.connect(admin).endRound()).to.be.revertedWith("LotteryWrongRound");
    });
  });
}
```

This script includes:
1. A test for successfully ending the current round and verifying the emitted event and the updated round information.
2. A reverting test case named "should fail: LotteryRoundNotActive" for attempting to end a round that has already ended.
3. A reverting test case named "should fail: LotteryWrongRound" for attempting to end a round without starting one.

By using `ZeroAddress` and directly importing `formatEther` and `ZeroAddress` from `ethers`, we ensure that the test script adheres to the specified requirements.
