import type { IERC721EnumOptions, TERC721MetadataOptions } from "@gemunion/contracts-erc721e";
import { shouldBehaveLikeERC721Burnable, shouldBehaveLikeERC721Metadata } from "@gemunion/contracts-erc721e";
import { TEMPLATE_ID } from "@gemunion/contracts-constants";

import { tokenId, templateId } from "../../../constants";
import { customMintCommonERC721 } from "../customMintFn";

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
