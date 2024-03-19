import type { IERC20Options } from "@gemunion/contracts-erc20";
import {
  shouldApprove,
  shouldBalanceOf,
  shouldBehaveLikeERC20Burnable,
  shouldBehaveLikeERC20Capped,
  shouldMint,
} from "@gemunion/contracts-erc20";

import { shouldReceive } from "../../../shared/receive";
import { shouldTransfer } from "./transfer";
import { shouldTransferFrom } from "./transferFrom";

export function shouldBehaveLikeERC20Whitelist(factory: () => Promise<any>, options: IERC20Options = {}) {
  shouldMint(factory, options);
  shouldBalanceOf(factory, options);
  shouldTransfer(factory, options);
  shouldTransferFrom(factory, options);
  shouldApprove(factory, options);

  shouldBehaveLikeERC20Burnable(factory, options);
  shouldBehaveLikeERC20Capped(factory);
  shouldReceive(factory);
}
