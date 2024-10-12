import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { shouldBehaveLikePausable, shouldSupportsInterface } from "@ethberry/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, PAUSER_ROLE } from "@ethberry/contracts-constants";

import { deployLotteryContract } from "./fixture";
import { shouldBehaveLikeLottery } from "./shared";

describe("Lottery", function () {
  shouldBehaveLikeLottery(deployLotteryContract);

  shouldBehaveLikeAccessControl(deployLotteryContract)(DEFAULT_ADMIN_ROLE, PAUSER_ROLE);
  shouldBehaveLikePausable(deployLotteryContract);

  shouldSupportsInterface(deployLotteryContract)([InterfaceId.IERC165, InterfaceId.IAccessControl]);
});
