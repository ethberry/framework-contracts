import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl, shouldBehaveLikeBlackList } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, METADATA_ROLE, MINTER_ROLE } from "@ethberry/contracts-constants";

import { shouldBehaveLikeDiscrete } from "./upgrade";
import { FrameworkInterfaceId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721Blacklist } from "../../ERC721/shared/blacklist";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

describe("ERC721BlacklistDiscrete", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeBlackList(factory);
  shouldBehaveLikeERC721Blacklist(factory);
  shouldBehaveLikeERC721Simple(factory);
  shouldMintCommon(factory);
  shouldBehaveLikeDiscrete(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC4906,
    InterfaceId.IBlackList,
    InterfaceId.IERC721Metadata,
    InterfaceId.IERC721Enumerable,
    FrameworkInterfaceId.IERC721Discrete,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
