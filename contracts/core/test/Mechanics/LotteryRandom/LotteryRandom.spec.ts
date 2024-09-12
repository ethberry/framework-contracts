import { shouldBehaveLikePausable, shouldSupportsInterface } from "@gemunion/contracts-utils";
import { InterfaceId } from "@gemunion/contracts-constants";

import { shouldBehaveLikeLotteryRandom } from "./shared/lotteryRandomBehavior";
import { deployLotteryRandomContract } from "./shared/fixtures";

describe("LotteryRandom", function () {
  shouldBehaveLikePausable(deployLotteryRandomContract);

  shouldBehaveLikeLotteryRandom(deployLotteryRandomContract);

  shouldSupportsInterface(deployLotteryRandomContract)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
  ]);
});
