import type { IERC721EnumOptions, TERC721MetadataOptions } from "@ethberry/contracts-erc721e";
import { shouldBehaveLikeERC721Burnable, shouldBehaveLikeERC721Metadata } from "@ethberry/contracts-erc721e";
import { TEMPLATE_ID } from "@ethberry/contracts-constants";

import { tokenId, templateId } from "../../../constants";
import { customMintCommonERC721 } from "../customMintFn";
import { shouldBehaveLikeERC721 } from "./base";
import { shouldBaseUrl } from "./baseUrl";

export function shouldBehaveLikeERC721Simple(
  factory: () => Promise<any>,
  options: IERC721EnumOptions = {},
  metadata: TERC721MetadataOptions = [{ key: TEMPLATE_ID, value: templateId }],
) {
  options = Object.assign({}, { mint: customMintCommonERC721, safeMint: customMintCommonERC721, tokenId }, options);

  shouldBehaveLikeERC721(factory, options);
  shouldBaseUrl(factory, options);
  shouldBehaveLikeERC721Burnable(factory, options);
  shouldBehaveLikeERC721Metadata(factory, options, metadata);
}
