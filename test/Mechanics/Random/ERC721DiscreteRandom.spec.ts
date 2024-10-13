import { shouldSupportsInterface } from "@ethberry/contracts-utils";
import {
  DEFAULT_ADMIN_ROLE,
  InterfaceId,
  METADATA_ROLE,
  MINTER_ROLE,
  RARITY,
  TEMPLATE_ID,
} from "@ethberry/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { FrameworkInterfaceId, templateId } from "../../constants";
import { shouldBehaveLikeDiscrete } from "../Discrete/upgrade";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldMintRandom } from "./shared/mintRandom";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

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
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
    InterfaceId.IERC4906,
    FrameworkInterfaceId.ERC721Random,
    FrameworkInterfaceId.ERC721Simple,
    FrameworkInterfaceId.IERC721Discrete,
  ]);
});
