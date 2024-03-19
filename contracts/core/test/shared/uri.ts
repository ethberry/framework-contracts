export const baseTokenURI = "http://localhost:3011/metadata/";

// full one: http://localhost:3011/metadata/{chainID}/address/tokenId/
export const getBaseTokenURI = (chainId: number | undefined): string => {
  return chainId ? `${baseTokenURI}${chainId.toString()}/` : baseTokenURI;
};
