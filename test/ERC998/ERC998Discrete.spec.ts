import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, METADATA_ROLE, MINTER_ROLE } from "@ethberry/contracts-constants";

import { FrameworkInterfaceId } from "../constants";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { shouldMintCommon } from "../ERC721/shared/simple/base/mintCommon";
import { shouldBehaveLikeDiscrete } from "../Mechanics/Discrete/upgrade";
import { shouldBehaveLikeERC998Simple } from "./shared/simple";

describe("ERC998Discrete", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeERC998Simple(factory);
  shouldBehaveLikeDiscrete(factory);
  shouldMintCommon(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC998TD,
    InterfaceId.IERC998WL,
    InterfaceId.IERC4906,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.IERC721Discrete,
  ]);
});
