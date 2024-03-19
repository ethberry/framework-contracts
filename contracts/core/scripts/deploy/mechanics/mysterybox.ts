import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";
import { baseTokenURI, MINTER_ROLE } from "@gemunion/contracts-constants";

export async function deployMysterybox(contracts: Record<string, any>) {
  const mysteryboxSimpleFactory = await ethers.getContractFactory("ERC721MysteryBoxSimple");
  const mysteryboxSimpleInstance = await mysteryboxSimpleFactory.deploy("Mysterybox", "MB721", 100, baseTokenURI);
  contracts.erc721MysteryboxSimple = mysteryboxSimpleInstance;
  await blockAwait();

  await contracts.erc721Simple.grantRole(MINTER_ROLE, await mysteryboxSimpleInstance.getAddress());
  await contracts.erc721Random.grantRole(MINTER_ROLE, await mysteryboxSimpleInstance.getAddress());
  await contracts.erc998Random.grantRole(MINTER_ROLE, await mysteryboxSimpleInstance.getAddress());
  await contracts.erc1155Simple.grantRole(MINTER_ROLE, await mysteryboxSimpleInstance.getAddress());
  await blockAwait();

  await mysteryboxSimpleInstance.grantRole(MINTER_ROLE, contracts.staking.address);
  await mysteryboxSimpleInstance.grantRole(MINTER_ROLE, contracts.exchange.address);
  await blockAwait();

  await contracts.contractManager.addFactory(await mysteryboxSimpleInstance.getAddress(), MINTER_ROLE);
  await blockAwait();

  const mysteryboxPausableFactory = await ethers.getContractFactory("ERC721MysteryBoxPausable");
  const mysteryboxPausableInstance = await mysteryboxPausableFactory.deploy("Mysterybox", "MB-P721", 100, baseTokenURI);
  contracts.erc721MysteryboxPausable = mysteryboxPausableInstance;
  await blockAwait();

  await contracts.erc721Simple.grantRole(MINTER_ROLE, await mysteryboxPausableInstance.getAddress());
  await contracts.erc721Random.grantRole(MINTER_ROLE, await mysteryboxPausableInstance.getAddress());
  await contracts.erc998Random.grantRole(MINTER_ROLE, await mysteryboxPausableInstance.getAddress());
  await contracts.erc1155Simple.grantRole(MINTER_ROLE, await mysteryboxPausableInstance.getAddress());
  await blockAwait();

  await mysteryboxPausableInstance.grantRole(MINTER_ROLE, contracts.staking.address);
  await mysteryboxPausableInstance.grantRole(MINTER_ROLE, contracts.exchange.address);
  await blockAwait();

  await contracts.contractManager.addFactory(await mysteryboxPausableInstance.getAddress(), MINTER_ROLE);
  await blockAwait();

  const mysteryboxBlacklistFactory = await ethers.getContractFactory("ERC721MysteryBoxBlacklist");
  const mysteryboxBlacklistInstance = await mysteryboxBlacklistFactory.deploy(
    "Mysterybox",
    "MB-BL721",
    100,
    baseTokenURI,
  );
  contracts.erc721MysteryboxBlacklist = mysteryboxBlacklistInstance;
  await blockAwait();

  await contracts.erc721Simple.grantRole(MINTER_ROLE, await mysteryboxBlacklistInstance.getAddress());
  await contracts.erc721Random.grantRole(MINTER_ROLE, await mysteryboxBlacklistInstance.getAddress());
  await contracts.erc998Random.grantRole(MINTER_ROLE, await mysteryboxBlacklistInstance.getAddress());
  await contracts.erc1155Simple.grantRole(MINTER_ROLE, await mysteryboxBlacklistInstance.getAddress());
  await blockAwait();

  await mysteryboxBlacklistInstance.grantRole(MINTER_ROLE, contracts.staking.address);
  await mysteryboxBlacklistInstance.grantRole(MINTER_ROLE, contracts.exchange.address);
  await blockAwait();

  await contracts.contractManager.addFactory(await mysteryboxBlacklistInstance.getAddress(), MINTER_ROLE);
  await blockAwait();
}
