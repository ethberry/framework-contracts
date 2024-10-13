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

import { FrameworkInterfaceId, templateId } from "../../constants";
import { shouldBehaveLikeDiscrete } from "../Discrete/upgrade";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { shouldMintRandom } from "./shared/mintRandom";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldBehaveLikeERC721Blacklist, shouldBehaveLikeERC721BlacklistRandom } from "../../ERC721/shared/blacklist";
import { shouldBehaveLikeERC721Rentable } from "../Rentable/shared";
import { shouldMintCommon } from "../../ERC721/shared/simple/base/mintCommon";

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
    FrameworkInterfaceId.IERC721Discrete,
    FrameworkInterfaceId.ERC721Simple,
  ]);
});
