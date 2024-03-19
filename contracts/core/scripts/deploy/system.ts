import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";
import { METADATA_ROLE, MINTER_ROLE } from "@gemunion/contracts-constants";

export async function deploySystem(contracts: Record<string, any>) {
  const vestFactory = await ethers.getContractFactory("ContractManager");
  contracts.contractManager = await vestFactory.deploy();
  await blockAwait();
  const exchangeFactory = await ethers.getContractFactory("Exchange");
  const exchangeInstance = await exchangeFactory.deploy("Exchange", [], []);
  contracts.exchange = exchangeInstance;
  await blockAwait();

  await contracts.contractManager.addFactory(await exchangeInstance.getAddress(), MINTER_ROLE);
  await contracts.contractManager.addFactory(await exchangeInstance.getAddress(), METADATA_ROLE);
  await blockAwait();
}
