import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import {
  DEFAULT_ADMIN_ROLE,
  InterfaceId,
  METADATA_ROLE,
  MINTER_ROLE,
  RARITY,
  TEMPLATE_ID,
} from "@gemunion/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { FrameworkInterfaceId, templateId } from "../constants";
import { shouldBehaveLikeDiscrete } from "../Mechanics/Discrete/upgrade";
import { deployERC721 } from "./shared/fixtures";
import { shouldMintRandom } from "./shared/random/mintRandom";
import { shouldBehaveLikeERC721Simple } from "./shared/simple";
import { shouldMintCommon } from "./shared/simple/base/mintCommon";

describe("ERC721DiscreteRandom", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE, METADATA_ROLE);
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
    FrameworkInterfaceId.ERC721Simple,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    FrameworkInterfaceId.ERC721Upgradable,
    InterfaceId.IERC4906,
    FrameworkInterfaceId.ERC721Random,
  ]);
});
