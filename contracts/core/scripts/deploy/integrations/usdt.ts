import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";

export async function deployUsdt(contracts: Record<string, any>) {
  const usdtFactory = await ethers.getContractFactory("TetherToken");
  contracts.usdt = await usdtFactory.deploy(100000000000, "Tether USD", "USDT", 6);
  await blockAwait();
}
