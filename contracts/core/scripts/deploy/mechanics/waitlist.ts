import { ethers } from "hardhat";

import { blockAwait, blockAwaitMs } from "@gemunion/contracts-helpers";

export async function deployWaitList(contracts: Record<string, any>) {
  const waitListFactory = await ethers.getContractFactory("WaitList");
  contracts.waitlist = await waitListFactory.deploy();
  await blockAwaitMs(30000);
  await blockAwait();
}
