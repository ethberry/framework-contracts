import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";

export async function deployWeth(contracts: Record<string, any>) {
  const wethFactory = await ethers.getContractFactory("WETH9");
  contracts.weth = await wethFactory.deploy();
  await blockAwait();
}
