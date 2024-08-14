import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { FrameworkInterfaceId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Blacklist } from "../../ERC721/shared/blacklist";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721LootBox } from "./shared/simple/base";
import { customMint } from "./shared/simple/customMintFn";
import { shouldBehaveLikeERC721LootBoxPausable } from "./shared/pausable/unpack";

describe("ERC721LootBoxBlacklistPausable", function () {
  const factory = () => deployERC721("ERC721LootBoxBlacklistPausableHardhat");

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, {
    mint: customMint,
    safeMint: customMint,
  });
  shouldBehaveLikeERC721Blacklist(factory, { mint: customMint });
  shouldBehaveLikeERC721LootBoxPausable(factory, { mint: customMint });
  shouldBehaveLikeERC721LootBox(factory);
  shouldBehaveLikeTopUp(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC1363Receiver,
    InterfaceId.IERC1363Spender,
    InterfaceId.IBlackList,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.ERC721Loot,
    FrameworkInterfaceId.ERC721Loot,
  ]);
});
