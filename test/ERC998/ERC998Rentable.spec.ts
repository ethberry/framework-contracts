import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployERC721 } from "../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Rentable } from "../Mechanics/Rentable/shared";
import { shouldBehaveLikeERC998Simple } from "./shared/simple";
import { FrameworkInterfaceId } from "../constants";

describe("ERC998Rentable", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC998Simple(factory);
  shouldBehaveLikeERC721Rentable(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC998TD,
    InterfaceId.IERC998WL,
    InterfaceId.IERC4907,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
