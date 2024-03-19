import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { deployERC721 } from "./shared/fixtures";
import { shouldNotMint } from "./shared/simple/base/shouldNotMint";
import { shouldNotSafeMint } from "./shared/simple/base/shouldNotSafeMint";
import { shouldNotMintCommon } from "./shared/shouldNotMintCommon";
import { shouldMintRandomGenes } from "./shared/random/mintRandom";
import { FrameworkInterfaceId } from "../constants";

describe("ERC721Genes", function () {
  const factory = () => deployERC721(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldNotMint(factory);
  shouldNotMintCommon(factory);
  shouldNotSafeMint(factory);
  shouldMintRandomGenes(factory);

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    FrameworkInterfaceId.ERC721Random,
  ]);
});
