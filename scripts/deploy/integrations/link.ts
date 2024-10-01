import { ethers } from "hardhat";

export async function deployLink(contracts: Record<string, any>) {
  const linkFactory = await ethers.getContractFactory("LinkToken");
  const linkInstance = await linkFactory.deploy();
  await linkInstance.deploymentTransaction()?.wait(1);

  contracts.link = linkInstance;
}
