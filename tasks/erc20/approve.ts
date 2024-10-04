import { task } from "hardhat/config";
import { WeiPerEther } from "ethers";

task("erc20-approve", "Approves ERC20 tokens to spender")
  .addParam("contract", "The ERC20 contract's address")
  .addParam("spender", "The spender's address")
  .addOptionalParam("value", "Amount")
  .setAction(async (args, hre) => {
    const { contract, spender, value = 1_000_000n } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC20Simple", contract);
    await contractInstance.approve(spender, WeiPerEther * value);
    console.info("ERC20 Approve");
  });

// hardhat erc20-approve --spender 0xfeae27388a65ee984f452f86effed42aabd438fd --contract 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --network gemunion_besu
