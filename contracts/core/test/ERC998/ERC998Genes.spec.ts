import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";

import { deployERC721 } from "../ERC721/shared/fixtures";
import { shouldNotMintCommon } from "../ERC721/shared/shouldNotMintCommon";
import { shouldNotMint } from "../ERC721/shared/simple/base/shouldNotMint";
import { shouldNotSafeMint } from "../ERC721/shared/simple/base/shouldNotSafeMint";
import { FrameworkInterfaceId } from "../constants";
import { shouldMintRandomGenes } from "./shared/random/mintRandom";

describe("ERC998Genes", function () {
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
