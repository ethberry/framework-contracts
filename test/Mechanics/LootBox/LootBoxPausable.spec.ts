import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@ethberry/contracts-constants";
import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { FrameworkInterfaceId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721LootBox } from "./shared/simple/base";
import { customMint } from "./shared/simple/customMintFn";
import { shouldBehaveLikeERC721LootBoxPausable } from "./shared/pausable/unpack";

describe("ERC721LootBoxPausable", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, {
    mint: customMint,
    safeMint: customMint,
  });
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
    FrameworkInterfaceId.ERC721Loot,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.ERC721Loot,
  ]);
});
