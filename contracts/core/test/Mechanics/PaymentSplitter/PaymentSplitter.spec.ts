import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { InterfaceId } from "@gemunion/contracts-constants";
import { shouldBehaveLikeSplitterWallet } from "@gemunion/contracts-finance";

import { deployPaymentSplitter } from "./fixture";

describe("PaymentSplitter", function () {
  const factory = () => deployPaymentSplitter();

  shouldBehaveLikeSplitterWallet(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
