import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";

import { FrameworkInterfaceId } from "../constants";
import { deployERC721 } from "./shared/fixtures";
import { shouldBehaveLikeERC721Soulbound } from "./shared/soulbound";
import { shouldMintCommon } from "./shared/simple/base/mintCommon";

describe("ERC721Soulbound", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Soulbound(factory);
  shouldMintCommon(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});