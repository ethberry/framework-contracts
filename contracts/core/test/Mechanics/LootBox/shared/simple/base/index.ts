import { shouldNotMintCommon } from "../../../../../ERC721/shared/shouldNotMintCommon";
import { shouldUnpackBox } from "./unpack";
import { shouldMintBox } from "./mint";
import { shouldUnpackBoxA } from "./unpackA";

export function shouldBehaveLikeERC721LootBox(factory: () => Promise<any>) {
  shouldMintBox(factory);
  shouldUnpackBox(factory);
  shouldNotMintCommon(factory);
}

export function shouldBehaveLikeERC721LootBoxA(factory: () => Promise<any>) {
  shouldUnpackBoxA(factory);
}
