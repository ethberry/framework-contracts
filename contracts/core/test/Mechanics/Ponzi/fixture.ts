import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "hardhat";

export async function deployPonzi(): Promise<any> {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("Ponzi");
  return factory.deploy([owner.address], [100]);
}
