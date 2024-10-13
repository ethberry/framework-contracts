import { shouldNotMint } from "../../../ERC721/shared/simple/base/shouldNotMint";
import { shouldNotSafeMint } from "../../../ERC721/shared/simple/base/shouldNotSafeMint";
import { shouldNotMintCommon } from "../../../ERC721/shared/shouldNotMintCommon";

import { shouldBreed } from "./breed";
import { shouldMintGenes } from "./mintGenes";

export function shouldBehaveLikeERC721Genes(factory: () => Promise<any>) {
  shouldNotMint(factory);
  shouldNotMintCommon(factory);
  shouldNotSafeMint(factory);

  shouldBreed(factory);
  shouldMintGenes(factory);
}
