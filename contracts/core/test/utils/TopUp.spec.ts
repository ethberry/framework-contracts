import { deployContract } from "@gemunion/contracts-utils";

import { shouldBehaveLikeTopUp } from "../shared/topUp";

describe("TopUpMock", function () {
  const factory = () => deployContract(this.title);

  shouldBehaveLikeTopUp(factory);
});
