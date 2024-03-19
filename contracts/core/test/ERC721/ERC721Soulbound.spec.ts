import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";

import { deployERC721 } from "./shared/fixtures";
import { shouldBehaveLikeERC721Burnable } from "./shared/simple/burnable";
import { shouldBehaveLikeERC721Soulbound } from "./shared/soulbound";
import { shouldMintCommon } from "./shared/simple/base/mintCommon";

describe("ERC721Soulbound", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC721Soulbound(factory);
  shouldMintCommon(factory);
  shouldBehaveLikeERC721Burnable(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IAccessControl, InterfaceId.IERC721]);
});
