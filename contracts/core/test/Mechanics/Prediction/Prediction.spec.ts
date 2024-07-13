import { deployContract, shouldBehaveLikePausable, shouldSupportsInterface } from "@gemunion/contracts-utils";
import { InterfaceId } from "@gemunion/contracts-constants";

describe("Prediction", function () {
  const factory = () => deployContract("Prediction");

  shouldBehaveLikePausable(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC1363Receiver,
    InterfaceId.IERC1363Spender,
  ]);
});
