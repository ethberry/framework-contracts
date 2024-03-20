import { batchSize, DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeERC721Consecutive } from "@gemunion/contracts-erc721c";

import { deployCollection } from "./shared/fixtures";
import { shouldMintConsecutive } from "./shared/simple/base/mintConsecutive";
import { shouldBehaveLikeERC721Collection } from "./shared/simple";
import { NodeEnv } from "../../types";

describe("ERC721CSimple", function () {
  // test timeout fails when batchSize = 5000n
  const overrideBatchSize = process.env.NODE_ENV === NodeEnv.test ? 10n : batchSize;

  const factory = () => deployCollection(this.title, overrideBatchSize);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);

  shouldBehaveLikeERC721Collection(factory, { batchSize: overrideBatchSize });
  shouldMintConsecutive(factory, { batchSize: overrideBatchSize });

  shouldBehaveLikeERC721Consecutive(factory, { batchSize: overrideBatchSize });

  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC721Metadata,
    InterfaceId.IRoyalty,
  ]);
});
