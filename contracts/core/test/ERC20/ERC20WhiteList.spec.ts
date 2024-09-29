import { shouldBehaveLikeAccessControl, shouldBehaveLikeWhiteList } from "@ethberry/contracts-access";
import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployERC1363 } from "./shared/fixtures";
import { shouldWhiteList } from "./shared/whitelist/whitelist";
import { shouldBehaveLikeERC20Whitelist } from "./shared/whitelist";
import { customMint } from "./shared/whitelist/customMintFn";

describe("ERC20Whitelist", function () {
  const factory = () => deployERC1363(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeWhiteList(factory);
  shouldWhiteList(factory);
  shouldBehaveLikeERC20Whitelist(factory, { mint: customMint });

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC20,
    InterfaceId.IERC1363,
    InterfaceId.IWhiteList,
    InterfaceId.IERC20Metadata,
  ]);
});
