import type { IERC20Options } from "@gemunion/contracts-erc20";

import { shouldBlacklist } from "./blacklist";

export function shouldBehaveLikeERC20BlackList(factory: () => Promise<any>, _options: IERC20Options = {}) {
  shouldBlacklist(factory);
}
