import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { FrameworkInterfaceId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Blacklist } from "../../ERC721/shared/blacklist";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721MysteryBox } from "./shared/simple/base";
import { customMint } from "./shared/simple/customMintFn";

describe("ERC721MysteryBoxBlacklist", function () {
  const factory = () => deployERC721("ERC721MysteryBoxBlacklist");

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, {
    mint: customMint,
    safeMint: customMint,
  });
  shouldBehaveLikeERC721Blacklist(factory, { mint: customMint });
  shouldBehaveLikeERC721MysteryBox(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IBlackList,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.ERC721Mystery,
  ]);
});
