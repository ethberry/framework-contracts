import { MINTER_ROLE } from "@gemunion/contracts-constants";
import {
  shouldBalanceOf,
  shouldBalanceOfBatch,
  shouldBehaveLikeERC1155Burnable,
  shouldBehaveLikeERC1155Royalty,
  shouldBehaveLikeERC1155Supply,
  shouldCustomURI,
  shouldMint,
  shouldMintBatch,
  shouldSafeBatchTransferFrom,
  shouldSafeTransferFrom,
  shouldSetApprovalForAll,
} from "@gemunion/contracts-erc1155";

export function shouldBehaveLikeERC1155(factory: () => Promise<any>) {
  shouldMint(factory, { minterRole: MINTER_ROLE });
  shouldMintBatch(factory, { minterRole: MINTER_ROLE });
  shouldBalanceOf(factory);
  shouldBalanceOfBatch(factory);
  shouldSetApprovalForAll(factory);
  shouldSafeTransferFrom(factory);
  shouldSafeBatchTransferFrom(factory);

  shouldCustomURI(factory);
}

export function shouldBehaveLikeERC1155Simple(factory: () => Promise<any>) {
  shouldBehaveLikeERC1155(factory);
  shouldBehaveLikeERC1155Burnable(factory);
  shouldBehaveLikeERC1155Royalty(factory);
  shouldBehaveLikeERC1155Supply(factory);
}
