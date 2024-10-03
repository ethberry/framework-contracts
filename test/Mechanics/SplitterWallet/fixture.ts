import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "hardhat";

export async function deploySplitterWallet(name = "SplitterWallet"): Promise<any> {
  const [owner, receiver] = await ethers.getSigners();
  const factory = await ethers.getContractFactory(name);
  return factory.deploy([owner.address, receiver.address], [50, 50]);
}
