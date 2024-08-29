import { ethers } from "hardhat";

export async function deployUsdc(contracts: Record<string, any>) {
  const [owner] = await ethers.getSigners();

  const usdcFactory = await ethers.getContractFactory("FiatTokenV1");
  const usdcInstance = await usdcFactory.deploy();
  await usdcInstance.deploymentTransaction()?.wait(1);

  // original contract is a upgradeable, this is emulation
  await usdcInstance.initialize("Circle USD", "USDC", "USD", 6, owner, owner, owner, owner);

  contracts.usdc = usdcInstance;
}
