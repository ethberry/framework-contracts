import { shouldStartRound } from "./startRound";
import { shouldEndRound } from "./endRound";
import { shouldPrintTicket } from "./printTicket";
import { shouldGetPrize } from "./getPrize";
import { shouldReleaseFunds } from "./releaseFunds";

export function shouldBehaveLikeLottery(deployLotteryContract: () => Promise<any>) {
  shouldStartRound(deployLotteryContract);
  shouldEndRound(deployLotteryContract);
  shouldPrintTicket(deployLotteryContract);
  shouldGetPrize(deployLotteryContract);
  shouldReleaseFunds(deployLotteryContract);
}
