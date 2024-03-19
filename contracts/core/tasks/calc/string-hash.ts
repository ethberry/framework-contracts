import { task } from "hardhat/config";

task("calc-string-hash", "Prints Errors enum").setAction(async (args, hre) => {
  const errFactory = await hre.ethers.getContractFactory("StringHashCalculator");
  const errInstance = await errFactory.deploy();
  await errInstance.test();
});
