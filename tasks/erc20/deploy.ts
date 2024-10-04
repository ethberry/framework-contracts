import { task } from "hardhat/config";
import { WeiPerEther } from "ethers";

task("erc20-deploy", "Deploys ERC20 contract").setAction(async (_, hre) => {
  const coinFactory = await hre.ethers.getContractFactory("ERC20Simple");
  const contractInstance = await coinFactory.deploy("Space Credits", "GEM20", WeiPerEther * 1_000_000n);
  console.info(`ERC20 deployed to ${await contractInstance.getAddress()}`);
});

// hardhat erc20-deploy --network gemunion_besu
