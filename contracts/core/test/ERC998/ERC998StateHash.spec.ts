import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldBehaveLikeStateHash } from "@gemunion/contracts-erc998td";

import { deployERC721 } from "../ERC721/shared/fixtures";
import { shouldBehaveLikeERC998Simple } from "./shared/simple";
import { customMintCommonERC721 } from "../ERC721/shared/customMintFn";
import { FrameworkInterfaceId, tokenId } from "../constants";

describe("ERC998StateHash", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC998Simple(factory);
  shouldBehaveLikeStateHash(factory, { mint: customMintCommonERC721, tokenId });

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC998TD,
    InterfaceId.IERC998WL,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
