import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { InterfaceId } from "@ethberry/contracts-constants";
import { shouldBehaveLikePaymentSplitter } from "@ethberry/contracts-finance";

import { deploySplitterWallet } from "./fixture";
import { shouldReceive } from "./shared/receive";

describe("SplitterWallet", function () {
  const factory = () => deploySplitterWallet();

  shouldBehaveLikePaymentSplitter(factory);
  shouldReceive(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
