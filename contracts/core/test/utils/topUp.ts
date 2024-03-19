import { deployContract } from "@gemunion/contracts-mocks";
import { shouldReceive } from "../shared/receive";
import { shouldBehaveLikeTopUp } from "../shared/topUp";

describe("TopUp", function () {
  const factory = () => deployContract(this.title);

  shouldBehaveLikeTopUp(factory);

  // this test exist only because receive method is always overridden in real contracts
  shouldReceive(factory);
});
