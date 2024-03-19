import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";

import { shouldSetBaseURI } from "./setBaseURI";
import { shouldTokenURI } from "./tokenURI";

export function shouldBaseUrl(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  shouldSetBaseURI(factory, options);
  shouldTokenURI(factory, options);
}
