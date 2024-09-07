import { shouldNotMint } from "../simple/base/shouldNotMint";
import { shouldNotSafeMint } from "../simple/base/shouldNotSafeMint";
import { shouldNotMintCommon } from "../shouldNotMintCommon";

import { shouldBreed } from "./breed";
import { shouldMintGenes } from "./mintGenes";

export function shouldBehaveLikeERC721Genes(factory: () => Promise<any>) {
  shouldNotMint(factory);
  shouldNotMintCommon(factory);
  shouldNotSafeMint(factory);

  shouldBreed(factory);
  shouldMintGenes(factory);
}
