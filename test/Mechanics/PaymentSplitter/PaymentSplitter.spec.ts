import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { InterfaceId } from "@ethberry/contracts-constants";
import { shouldBehaveLikeSplitterWallet } from "@ethberry/contracts-finance";

import { deployPaymentSplitter } from "./fixture";

describe("PaymentSplitter", function () {
  const factory = () => deployPaymentSplitter();

  shouldBehaveLikeSplitterWallet(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
