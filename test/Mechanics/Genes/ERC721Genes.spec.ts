import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Genes } from "./shared";

import { FrameworkInterfaceId } from "../../constants";

describe("ERC721Genes", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Genes(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    FrameworkInterfaceId.ERC721Genes,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
