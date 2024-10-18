import {
  shouldBehaveLikeERC1155Burnable,
  shouldBehaveLikeERC1155Royalty,
  shouldBehaveLikeERC1155Supply,
  shouldBehaveLikeERC1155BaseUrl,
} from "@ethberry/contracts-erc1155";

import { shouldBehaveLikeERC1155 } from "./base";

export function shouldBehaveLikeERC1155Simple(factory: () => Promise<any>) {
  shouldBehaveLikeERC1155(factory);

  shouldBehaveLikeERC1155Burnable(factory);
  shouldBehaveLikeERC1155Royalty(factory);
  shouldBehaveLikeERC1155Supply(factory);
  shouldBehaveLikeERC1155BaseUrl(factory);
}
