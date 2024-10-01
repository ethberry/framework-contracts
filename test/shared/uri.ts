import { baseTokenURI } from "@ethberry/contracts-constants";

// full one: http://localhost:3011/metadata/{chainID}/address/tokenId/
export const getBaseTokenURI = (chainId: number | undefined): string => {
  return chainId ? `${baseTokenURI}${chainId.toString()}/` : baseTokenURI;
};
