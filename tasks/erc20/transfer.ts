import { task } from "hardhat/config";
import { WeiPerEther } from "ethers";

task("erc20-transfer", "Prints an ERC20 balance")
  .addParam("contract", "The ERC20 contract's address")
  .addParam("to", "The spender's address")
  .addOptionalParam("value", "The spender's address")
  .setAction(async (args, hre) => {
    const { contract, to, value = 1_000_000n } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC20Simple", contract);
    await contractInstance.transfer(to, WeiPerEther * value);
    console.info("ERC20 Transfer");
  });

// hardhat erc20-transfer --contract 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --receiver 0xfeae27388a65ee984f452f86effed42aabd438fd  --network besu
