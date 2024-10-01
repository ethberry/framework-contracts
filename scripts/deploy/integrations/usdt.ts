import { ethers } from "hardhat";

export async function deployUsdt(contracts: Record<string, any>) {
  const usdtFactory = await ethers.getContractFactory("TetherToken");
  const usdtInstance = await usdtFactory.deploy(100000000000, "Tether USD", "USDT", 6);
  await usdtInstance.deploymentTransaction()?.wait(1);

  contracts.usdt = usdtInstance;
}
