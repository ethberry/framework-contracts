import { ethers } from "hardhat";

async function main() {
  const dispenserFactory = await ethers.getContractFactory("Dispenser");
  const dispenserInstance = await dispenserFactory.deploy();
  await dispenserInstance.waitForDeployment();
  console.info(`DISPENSER_ADDR=${await dispenserInstance.getAddress()}`);

  return "OK";
}

main().then(console.info).catch(console.error);
