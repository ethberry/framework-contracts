import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";
import {
  shouldApprove,
  shouldBehaveLikeERC721Burnable,
  shouldBehaveLikeERC721Metadata,
  shouldGetBalanceOf,
  shouldGetOwnerOf,
  shouldSafeMint,
  shouldSetApprovalForAll,
} from "@gemunion/contracts-erc721e";

import { tokenId } from "../../../constants";
import { shouldReceive } from "../../../shared/receive";
import { customMintCommonERC721 } from "../customMintFn";
import { shouldNotSafeMint } from "../simple/base/shouldNotSafeMint";
import { shouldNotMint } from "../simple/base/shouldNotMint";
import { shouldBaseUrl } from "../simple/baseUrl";
import { shouldTransferFrom } from "./transferFrom";
import { shouldSafeTransferFrom } from "./safeTransferFrom";

export function shouldBehaveLikeERC721Soulbound(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  options = Object.assign({}, { mint: customMintCommonERC721, safeMint: customMintCommonERC721, tokenId }, options);

  shouldApprove(factory, options);
  shouldGetBalanceOf(factory, options);
  shouldGetOwnerOf(factory, options);
  shouldSetApprovalForAll(factory, options);
  shouldSafeMint(factory, options);
  shouldTransferFrom(factory, options);
  shouldSafeTransferFrom(factory, options);

  shouldNotMint(factory);
  shouldNotSafeMint(factory);
  shouldReceive(factory);

  shouldBehaveLikeERC721Burnable(factory, options);
  shouldBehaveLikeERC721Metadata(factory, options);
  shouldBaseUrl(factory);
}
