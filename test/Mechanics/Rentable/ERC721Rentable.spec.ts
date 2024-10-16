import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721Rentable } from "./shared";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";
import { FrameworkInterfaceId } from "../../constants";

describe("ERC721Rentable", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC721Simple(factory);
  shouldBehaveLikeERC721Rentable(factory);
  shouldMintCommon(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC4907,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});