import { ethers } from "hardhat";

import { blockAwait, blockAwaitMs } from "@ethberry/contracts-helpers";
import { baseTokenURI, royalty } from "@ethberry/contracts-constants";

export async function deployWrapper(contracts: Record<string, any>) {
  const erc721WrapFactory = await ethers.getContractFactory("ERC721Wrapper");
  contracts.erc721Wrapper = await erc721WrapFactory.deploy("WRAPPER", "WRAP", royalty, baseTokenURI);
  await blockAwaitMs(30000);
  await blockAwait();
}
