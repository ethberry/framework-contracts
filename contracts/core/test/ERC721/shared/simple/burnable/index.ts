import { shouldBurn } from "./burn";

export function shouldBehaveLikeERC721Burnable(factory: () => Promise<any>) {
  shouldBurn(factory);
}
