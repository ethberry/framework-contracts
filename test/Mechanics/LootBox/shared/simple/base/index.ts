import { shouldNotMintCommon } from "../../../../../ERC721/shared/shouldNotMintCommon";
import { shouldUnpackBox } from "./unpack";
import { shouldMintBox } from "./mintBox";

export function shouldBehaveLikeERC721LootBox(factory: () => Promise<any>) {
  shouldMintBox(factory);
  shouldUnpackBox(factory);
  shouldNotMintCommon(factory);
}