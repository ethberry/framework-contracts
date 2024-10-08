import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { shouldBehaveLikePausable, shouldSupportsInterface } from "@ethberry/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, PAUSER_ROLE } from "@ethberry/contracts-constants";

import { deployLotteryRandomContract } from "./fixture";
import { shouldBehaveLikeLottery } from "./shared";

describe("Lottery", function () {
  shouldBehaveLikeLottery(deployLotteryRandomContract);

  shouldBehaveLikeAccessControl(deployLotteryRandomContract)(DEFAULT_ADMIN_ROLE, PAUSER_ROLE);
  shouldBehaveLikePausable(deployLotteryRandomContract);

  shouldSupportsInterface(deployLotteryRandomContract)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
  ]);
});
