import {
  shouldBalanceOf,
  shouldBalanceOfBatch,
  shouldCustomURI,
  shouldMint,
  shouldMintBatch,
  shouldSafeBatchTransferFrom,
  shouldSafeTransferFrom,
  shouldSetApprovalForAll,
} from "@ethberry/contracts-erc1155";

export function shouldBehaveLikeERC1155(factory: () => Promise<any>) {
  shouldMint(factory);
  shouldMintBatch(factory);
  shouldBalanceOf(factory);
  shouldBalanceOfBatch(factory);
  shouldSetApprovalForAll(factory);
  shouldSafeTransferFrom(factory);
  shouldSafeBatchTransferFrom(factory);

  shouldCustomURI(factory);
}
