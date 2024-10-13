import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import { shouldBehaveLikeAccessControl, shouldBehaveLikeBlackList } from "@ethberry/contracts-access";
import {
  DEFAULT_ADMIN_ROLE,
  InterfaceId,
  METADATA_ROLE,
  MINTER_ROLE,
  RARITY,
  TEMPLATE_ID,
} from "@ethberry/contracts-constants";

import { FrameworkInterfaceId, templateId } from "../constants";
import { shouldMintCommon } from "../ERC721/shared/simple/base/mintCommon";
import { shouldMintRandom } from "../Mechanics/Random/shared/mintRandom";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { shouldBehaveLikeDiscrete } from "../Mechanics/Discrete/upgrade";
import { shouldBehaveLikeERC721Blacklist, shouldBehaveLikeERC721BlacklistRandom } from "../ERC721/shared/blacklist";
import { shouldBehaveLikeERC998Simple } from "./shared/simple";

describe("ERC998BlacklistDiscreteRandom", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
  shouldBehaveLikeBlackList(factory);
  shouldBehaveLikeERC721Blacklist(factory);
  shouldBehaveLikeERC721BlacklistRandom(factory);
  shouldBehaveLikeERC998Simple(factory, {}, [
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
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC998TD,
    InterfaceId.IERC998WL,
    InterfaceId.IBlackList,
    InterfaceId.IERC4906,
    FrameworkInterfaceId.IERC721Discrete,
    FrameworkInterfaceId.ERC721Random,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
