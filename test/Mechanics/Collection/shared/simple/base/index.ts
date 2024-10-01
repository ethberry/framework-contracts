import type { IERC721Options } from "@ethberry/contracts-erc721";
import {
  shouldApprove,
  shouldGetBalanceOf,
  shouldGetOwnerOf,
  shouldSafeMint,
  shouldSafeTransferFrom,
  shouldSetApprovalForAll,
  shouldTransferFrom,
} from "@ethberry/contracts-erc721";

import { shouldReceive } from "../../../../../shared/receive";
import { shouldNotMint } from "./shouldNotMint";
import { shouldNotSafeMint } from "./shouldNotSafeMint";

export function shouldBehaveLikeERC721(factory: () => Promise<any>, options?: IERC721Options) {
  shouldApprove(factory, options);
  shouldGetBalanceOf(factory, options);
  shouldGetOwnerOf(factory, options);
  shouldSetApprovalForAll(factory, options);
  shouldTransferFrom(factory, options);
  shouldSafeTransferFrom(factory, options);
  shouldSafeMint(factory, options);

  shouldNotMint(factory);
  shouldNotSafeMint(factory);
  shouldReceive(factory);
}
