import { shouldStartRound } from "./startRound";
import { shouldEndRound } from "./endRound";
import { shouldPrintTicket } from "./printTicket";
import { shouldGetPrize } from "./getPrize";
import { shouldReleaseFunds } from "./releaseFunds";

export function shouldBehaveLikeLotteryRandom(deployLotteryRandomContract: () => Promise<any>) {
  describe("LotteryRandom behavior", function () {
    shouldStartRound(deployLotteryRandomContract);
    shouldEndRound(deployLotteryRandomContract);
    shouldPrintTicket(deployLotteryRandomContract);
    shouldGetPrize(deployLotteryRandomContract);
    shouldReleaseFunds(deployLotteryRandomContract);
  });
}
