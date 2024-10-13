import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl, shouldBehaveLikeBlackList } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, METADATA_ROLE, MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721Blacklist } from "../../ERC721/shared/blacklist";
import { shouldBehaveLikeERC721Rentable } from "./shared";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";
import { FrameworkInterfaceId } from "../../constants";

describe("ERC721BlacklistRentable", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeBlackList(factory);
  shouldBehaveLikeERC721Blacklist(factory);
  shouldBehaveLikeERC721Simple(factory);
  shouldMintCommon(factory);
  shouldBehaveLikeERC721Rentable(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Enumerable,
    InterfaceId.IERC721Metadata,
    InterfaceId.IERC4907,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
