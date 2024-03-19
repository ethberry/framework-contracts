import type { IERC721EnumOptions, TERC721MetadataOptions } from "@gemunion/contracts-erc721e";
import { shouldBehaveLikeERC998WhiteListChild } from "@gemunion/contracts-erc998td";
import { TEMPLATE_ID } from "@gemunion/contracts-constants";

import { templateId, tokenId } from "../../../constants";
import { shouldBehaveLikeERC721Simple } from "../../../ERC721/shared/simple";
import { customMintCommonERC721 } from "../../../ERC721/shared/customMintFn";
import { shouldBehaveLikeERC998 } from "./base";

export function shouldBehaveLikeERC998Simple(
  factory: () => Promise<any>,
  options?: IERC721EnumOptions,
  metadata: TERC721MetadataOptions = [{ key: TEMPLATE_ID, value: templateId }],
) {
  options = Object.assign({}, { mint: customMintCommonERC721, safeMint: customMintCommonERC721, tokenId }, options);

  shouldBehaveLikeERC721Simple(factory, options, metadata);
  shouldBehaveLikeERC998(factory, options);
  shouldBehaveLikeERC998WhiteListChild(factory, options);
}
