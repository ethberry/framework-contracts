import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";
import { baseTokenURI, royalty } from "@gemunion/contracts-constants";

export async function deployERC998(contracts: Record<string, any>) {
  const erc998SimpleFactory = await ethers.getContractFactory("ERC998Simple");
  contracts.erc998Simple = await erc998SimpleFactory.deploy("ERC998 SIMPLE", "GEM998", royalty, baseTokenURI);
  await blockAwait();

  const erc998InactiveFactory = await ethers.getContractFactory("ERC998Simple");
  contracts.erc998Inactive = await erc998InactiveFactory.deploy("ERC998 INACTIVE", "OFF998", royalty, baseTokenURI);
  await blockAwait();

  const erc998NewFactory = await ethers.getContractFactory("ERC998Simple");
  contracts.erc998New = await erc998NewFactory.deploy("ERC998 NEW", "NEW998", royalty, baseTokenURI);
  await blockAwait();

  const erc998BlacklistFactory = await ethers.getContractFactory("ERC998Blacklist");
  contracts.erc998Blacklist = await erc998BlacklistFactory.deploy("ERC998 BLACKLIST", "BL998", royalty, baseTokenURI);
  await blockAwait();

  const ERC998DiscreteFactory = await ethers.getContractFactory("ERC998Discrete");
  contracts.erc998Discrete = await ERC998DiscreteFactory.deploy("ERC998 LVL", "LVL998", royalty, baseTokenURI);
  await blockAwait();

  const erc998RandomFactory = await ethers.getContractFactory("ERC998RandomBesu");
  const erc998RandomInstance = await erc998RandomFactory.deploy("ERC998 HERO", "RNG998", royalty, baseTokenURI);
  await blockAwait();

  await erc998RandomInstance.whiteListChild(contracts.erc721Random.address, 5);
  contracts.erc998Random = erc998RandomInstance;
  await blockAwait();

  const erc998GenesFactory = await ethers.getContractFactory("ERC998Genes");
  contracts.erc998Genes = await erc998GenesFactory.deploy("ERC998 AXIE", "DNA998", royalty, baseTokenURI);
  await blockAwait();
}
