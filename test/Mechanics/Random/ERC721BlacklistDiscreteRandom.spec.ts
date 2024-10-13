import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl, shouldBehaveLikeBlackList } from "@ethberry/contracts-access";
import {
  DEFAULT_ADMIN_ROLE,
  InterfaceId,
  METADATA_ROLE,
  MINTER_ROLE,
  TEMPLATE_ID,
  RARITY,
} from "@ethberry/contracts-constants";

import { shouldBehaveLikeDiscrete } from "../Discrete/upgrade";
import { FrameworkInterfaceId, templateId } from "../../constants";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldMintRandom } from "./shared/mintRandom";
import { shouldBehaveLikeERC721Blacklist, shouldBehaveLikeERC721BlacklistRandom } from "../../ERC721/shared/blacklist";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

describe("ERC721BlacklistDiscreteRandom", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeBlackList(factory);
  shouldBehaveLikeERC721Blacklist(factory);
  shouldBehaveLikeERC721BlacklistRandom(factory);
  shouldBehaveLikeERC721Simple(factory, {}, [
    { key: TEMPLATE_ID, value: templateId },
    { key: RARITY, value: 0n },
  ]);
  shouldMintCommon(factory);
  shouldMintRandom(factory);
  shouldBehaveLikeDiscrete(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC4906,
    InterfaceId.IBlackList,
    InterfaceId.IERC721Enumerable,
    InterfaceId.IERC721Metadata,
    FrameworkInterfaceId.IERC721Discrete,
    FrameworkInterfaceId.ERC721Random,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
