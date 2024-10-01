import { task } from "hardhat/config";

task("block-number", "Prints the current block number", async (_, hre) => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.info(`Current block number: ${blockNumber}`);
});
