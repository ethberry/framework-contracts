import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { FrameworkInterfaceId, tokenId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { shouldBehaveLikeERC721Simple } from "./shared/simple";
import { shouldBehaveLikeERC721LootBox } from "./shared/simple/base";
import { customMint } from "./shared/simple/customMintFn";
import { shouldBehaveLikeERC721LootBoxPausable } from "./shared/pausable/unpack";

describe("ERC721LootBoxPausable", function () {
  const factory = () => deployERC721("ERC721LootBoxPausableHardhat");

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC721Simple(factory, { mint: customMint, tokenId });
  shouldBehaveLikeERC721LootBoxPausable(factory, { mint: customMint });
  shouldBehaveLikeERC721LootBox(factory);
  shouldBehaveLikeTopUp(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    FrameworkInterfaceId.ERC721Loot,
  ]);
});
