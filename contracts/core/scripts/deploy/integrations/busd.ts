import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";

export async function deployBusd(contracts: Record<string, any>) {
  const usdtFactory = await ethers.getContractFactory("BEP20Token");
  contracts.busd = await usdtFactory.deploy();
  await blockAwait();
}
