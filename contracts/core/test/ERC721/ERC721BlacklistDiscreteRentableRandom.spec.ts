import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl, shouldBehaveLikeBlackList } from "@gemunion/contracts-access";
import {
  DEFAULT_ADMIN_ROLE,
  InterfaceId,
  METADATA_ROLE,
  MINTER_ROLE,
  RARITY,
  TEMPLATE_ID,
} from "@gemunion/contracts-constants";

import { FrameworkInterfaceId, templateId } from "../constants";
import { shouldBehaveLikeDiscrete } from "../Mechanics/Discrete/upgrade";
import { deployERC721 } from "./shared/fixtures";
import { shouldMintRandom } from "./shared/random/mintRandom";
import { shouldBehaveLikeERC721Simple } from "./shared/simple";
import { shouldBehaveLikeERC721Blacklist, shouldBehaveLikeERC721BlacklistRandom } from "./shared/blacklist";
import { shouldBehaveLikeERC721Rentable } from "./shared/rentable";
import { shouldMintCommon } from "./shared/simple/base/mintCommon";

describe("ERC721BlacklistDiscreteRentableRandom", function () {
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
  shouldBehaveLikeERC721Rentable(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC4906,
    InterfaceId.IBlackList,
    InterfaceId.IERC721Metadata,
    InterfaceId.IERC721Enumerable,
    InterfaceId.IERC4907,
    FrameworkInterfaceId.ERC721Random,
    FrameworkInterfaceId.ERC721Upgradable,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
