import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { FrameworkInterfaceId, tokenId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { shouldBehaveLikeERC721Simple } from "./shared/simple";
import { shouldBehaveLikeERC721LootBox, shouldBehaveLikeERC721LootBoxA } from "./shared/simple/base";
import { customMint } from "./shared/simple/customMintFn";

describe("ERC721LootBoxSimple", function () {
  const factory = () => deployERC721("ERC721LootBoxSimpleHardhat");
  const factoryA = () => deployERC721("ERC721LootBoxSimpleAHardhat");

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC721Simple(factory, { mint: customMint, tokenId });
  shouldBehaveLikeERC721LootBox(factory);
  shouldBehaveLikeERC721LootBoxA(factoryA);
  shouldBehaveLikeTopUp(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.ERC721Loot,
  ]);
});
