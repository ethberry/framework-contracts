import { DEFAULT_ADMIN_ROLE, InterfaceId } from "@gemunion/contracts-constants";
import { deployContract, shouldBehaveLikePausable, shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { shouldClaim } from "./shared/claim";
import { shouldSetReward } from "./shared/setReward";

describe("WaitList", function () {
  const factory = () => deployContract(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE);
  shouldBehaveLikePausable(factory);
  shouldBehaveLikeTopUp(factory);
  shouldSetReward(factory);
  shouldClaim(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC1363Receiver,
    InterfaceId.IERC1363Spender,
  ]);
});
