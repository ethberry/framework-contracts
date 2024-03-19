import type { IERC721Options } from "@gemunion/contracts-erc721";

import { shouldSetBaseURI } from "./setBaseURI";
import { shouldTokenURI } from "./tokenURI";

export function shouldBaseUrl(factory: () => Promise<any>, options: IERC721Options = {}) {
  shouldSetBaseURI(factory, options);
  shouldTokenURI(factory, options);
}
