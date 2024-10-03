import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { InterfaceId } from "@ethberry/contracts-constants";
import { shouldBehaveLikeSplitterWallet } from "@ethberry/contracts-finance";

import { deploySplitterWallet } from "./fixture";

describe("SplitterWallet", function () {
  const factory = () => deploySplitterWallet();

  shouldBehaveLikeSplitterWallet(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
