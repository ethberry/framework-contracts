import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";
import { baseTokenURI, royalty } from "@gemunion/contracts-constants";

export async function deployERC721(contracts: Record<string, any>) {
  const erc721SimpleFactory = await ethers.getContractFactory("ERC721Simple");
  contracts.erc721Simple = await erc721SimpleFactory.deploy("RUNE", "GEM721", royalty, baseTokenURI);
  await blockAwait();

  const erc721InactiveFactory = await ethers.getContractFactory("ERC721Simple");
  contracts.erc721Inactive = await erc721InactiveFactory.deploy("ERC721 INACTIVE", "OFF721", royalty, baseTokenURI);
  await blockAwait();

  const erc721NewFactory = await ethers.getContractFactory("ERC721Simple");
  contracts.erc721New = await erc721NewFactory.deploy("ERC721 NEW", "NEW721", royalty, baseTokenURI);
  await blockAwait();

  const erc721BlacklistFactory = await ethers.getContractFactory("ERC721Blacklist");
  contracts.erc721Blacklist = await erc721BlacklistFactory.deploy("ERC721 BLACKLIST", "BL721", royalty, baseTokenURI);
  await blockAwait();

  const ERC721DiscreteFactory = await ethers.getContractFactory("ERC721Discrete");
  contracts.erc721Discrete = await ERC721DiscreteFactory.deploy("ERC721 ARMOUR", "LVL721", royalty, baseTokenURI);
  await blockAwait();

  const erc721RandomFactory = await ethers.getContractFactory("ERC721RandomBesu");
  contracts.erc721Random = await erc721RandomFactory.deploy("ERC721 WEAPON", "RNG721", royalty, baseTokenURI);
  await blockAwait();

  const erc721SoulboundFactory = await ethers.getContractFactory("ERC721Soulbound");
  contracts.erc721Soulbound = await erc721SoulboundFactory.deploy("ERC721 MEDAL", "SB721", royalty, baseTokenURI);
  await blockAwait();

  const erc721GenesFactory = await ethers.getContractFactory("ERC721Genes");
  contracts.erc721Genes = await erc721GenesFactory.deploy("ERC721 AXIE", "DNA721", royalty, baseTokenURI);
  await blockAwait();
}
