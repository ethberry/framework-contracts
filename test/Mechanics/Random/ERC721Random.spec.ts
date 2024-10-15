import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE, RARITY, TEMPLATE_ID } from "@ethberry/contracts-constants";

import { FrameworkInterfaceId, templateId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldMintRandom } from "./shared/mintRandom";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

describe("ERC721Random", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, {}, [
    { key: TEMPLATE_ID, value: templateId },
    { key: RARITY, value: 0n },
  ]);
  shouldMintCommon(factory);
  shouldMintRandom(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    FrameworkInterfaceId.ERC721Random,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
