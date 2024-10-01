import { shouldUserExprires, shouldUserOf } from "@ethberry/contracts-erc721e";
import type { IERC721EnumOptions } from "@ethberry/contracts-erc721e";

import { shouldSetUser } from "./setUser";
import { customMintCommonERC721 } from "../customMintFn";

export function shouldBehaveLikeERC721Rentable(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  options = Object.assign({}, { mint: customMintCommonERC721, tokenId: 1 }, options);

  shouldSetUser(factory, options);
  shouldUserOf(factory, options);
  shouldUserExprires(factory, options);
}
