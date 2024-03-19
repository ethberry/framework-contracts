import { ethers, network } from "hardhat";

import { baseTokenURI, royalty, tokenName, tokenSymbol } from "@gemunion/contracts-constants";
import { getContractName } from "../../utils";

export async function deployERC721(name = "ERC721Simple"): Promise<any> {
  const factory = await ethers.getContractFactory(getContractName(name, network.name));
  return factory.deploy(tokenName, tokenSymbol, royalty, baseTokenURI);
}
