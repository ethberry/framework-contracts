import {
  shouldChildContractsFor,
  shouldChildExists,
  shouldGetRootOwnerOfChild,
  shouldOwnerOfChild,
  shouldSafeTransferChild,
  shouldSafeTransferFrom,
  shouldTransferChild,
  shouldTransferChildToParent,
} from "@gemunion/contracts-erc998td";
import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";

export function shouldBehaveLikeERC998(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  shouldChildContractsFor(factory, options);
  shouldChildExists(factory, options);
  shouldTransferChildToParent(factory, options);
  shouldOwnerOfChild(factory, options);
  shouldGetRootOwnerOfChild(factory, options);
  shouldSafeTransferChild(factory, options);
  shouldSafeTransferFrom(factory, options);
  shouldTransferChild(factory, options);
}
