import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, METADATA_ROLE, MINTER_ROLE } from "@ethberry/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { FrameworkInterfaceId } from "../../constants";
import { shouldBehaveLikeDiscrete } from "../Discrete/upgrade";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721Rentable } from "./shared";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

describe("ERC721DiscreteRentable", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);

  shouldBehaveLikeERC721Simple(factory);
  shouldMintCommon(factory);
  shouldBehaveLikeDiscrete(factory);
  shouldBehaveLikeERC721Rentable(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC4906,
    InterfaceId.IERC4907,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.IERC721Discrete,
  ]);
});
