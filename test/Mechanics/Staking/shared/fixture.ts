import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "hardhat";

export async function deployStaking(name = "Staking"): Promise<any> {
  const factory = await ethers.getContractFactory(name);
  return factory.deploy();
}
