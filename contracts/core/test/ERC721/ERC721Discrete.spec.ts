import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, METADATA_ROLE, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { shouldBehaveLikeDiscrete } from "../Mechanics/Discrete/upgrade";
import { FrameworkInterfaceId } from "../constants";
import { deployERC721 } from "./shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "./shared/simple";
import { shouldMintCommon } from "./shared/simple/base/mintCommon";

describe("ERC721Discrete", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeERC721Simple(factory);
  shouldMintCommon(factory);
  shouldBehaveLikeDiscrete(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    FrameworkInterfaceId.ERC721Simple,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    FrameworkInterfaceId.ERC721Upgradable,
    InterfaceId.IERC4906,
  ]);
});
