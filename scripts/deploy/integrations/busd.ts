import { ethers } from "hardhat";

export async function deployBusd(contracts: Record<string, any>) {
  const busdFactory = await ethers.getContractFactory("BEP20Token");
  const busdInstance = await busdFactory.deploy();
  await busdInstance.deploymentTransaction()?.wait(1);

  contracts.busd = busdInstance;
}
