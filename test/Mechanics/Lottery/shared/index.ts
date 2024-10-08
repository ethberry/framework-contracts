import { shouldStartRound } from "./startRound";
import { shouldEndRound } from "./endRound";
import { shouldPrintTicket } from "./printTicket";
import { shouldGetPrize } from "./getPrize";
import { shouldReleaseFunds } from "./releaseFunds";

export function shouldBehaveLikeLottery(deployLotteryRandomContract: () => Promise<any>) {
  shouldStartRound(deployLotteryRandomContract);
  shouldEndRound(deployLotteryRandomContract);
  shouldPrintTicket(deployLotteryRandomContract);
  shouldGetPrize(deployLotteryRandomContract);
  shouldReleaseFunds(deployLotteryRandomContract);
}
