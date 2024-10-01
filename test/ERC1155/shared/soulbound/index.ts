import {
  shouldBalanceOf,
  shouldBalanceOfBatch,
  shouldBehaveLikeERC1155Burnable,
  shouldBehaveLikeERC1155Royalty,
  shouldBehaveLikeERC1155Supply,
  shouldCustomURI,
  shouldMint,
  shouldMintBatch,
  shouldSetApprovalForAll,
} from "@ethberry/contracts-erc1155";

import { shouldSafeTransferFrom } from "./shouldSafeTransferFrom";
import { shouldSafeBatchTransferFrom } from "./safeBatchTransferFrom";

export function shouldBehaveLikeERC1155Soulbound(factory: () => Promise<any>) {
  shouldMint(factory);
  shouldMintBatch(factory);
  shouldBalanceOf(factory);
  shouldBalanceOfBatch(factory);
  shouldSetApprovalForAll(factory);
  shouldSafeTransferFrom(factory);
  shouldSafeBatchTransferFrom(factory);

  shouldCustomURI(factory);

  shouldBehaveLikeERC1155Burnable(factory);
  shouldBehaveLikeERC1155Royalty(factory);
  shouldBehaveLikeERC1155Supply(factory);
}
