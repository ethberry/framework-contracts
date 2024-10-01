import { ethers } from "hardhat";

export async function deployWeth(contracts: Record<string, any>) {
  const wethFactory = await ethers.getContractFactory("WETH9");
  const wethInstance = await wethFactory.deploy();
  await wethInstance.deploymentTransaction()?.wait(1);

  contracts.weth = wethInstance;
}
