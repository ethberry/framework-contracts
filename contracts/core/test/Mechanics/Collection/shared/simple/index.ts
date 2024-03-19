import type { IERC721Options } from "@gemunion/contracts-erc721";
import { shouldBehaveLikeERC721Burnable } from "@gemunion/contracts-erc721";
import { batchSize } from "@gemunion/contracts-constants";

import { shouldBehaveLikeERC721 } from "./base";
import { shouldBaseUrl } from "./baseUrl";
import { customMintConsecutive } from "../customMintFn";
import { tokenId } from "../../../../constants";

export function shouldBehaveLikeERC721Collection(factory: () => Promise<any>, options: IERC721Options = {}) {
  options = Object.assign(
    {},
    {
      mint: customMintConsecutive,
      safeMint: customMintConsecutive,
      tokenId,
      batchSize,
    },
    options,
  );

  shouldBehaveLikeERC721(factory, options);
  shouldBehaveLikeERC721Burnable(factory, options);
  shouldBaseUrl(factory, options);
}
