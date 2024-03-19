import { shouldNotMintCommon } from "../../../../../ERC721/shared/shouldNotMintCommon";
import { shouldUnpackBox } from "./unpack";
import { shouldMintBox } from "./mint";

export function shouldBehaveLikeERC721MysteryBox(factory: () => Promise<any>) {
  shouldMintBox(factory);
  shouldUnpackBox(factory);
  shouldNotMintCommon(factory);
}
