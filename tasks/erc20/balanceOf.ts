import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("erc20-balance-of", "Prints an ERC20 balance")
  .addParam("contract", "The ERC20 contract's address")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const { account, contract } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC20Simple", contract);
    const accBalance = await contractInstance.balanceOf(account);

    console.info("ERC20 Balance:", formatEther(accBalance.toString()));
  });

// hardhat erc20-balance-of --contract 0xfeae27388a65ee984f452f86effed42aabd438fd --account 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --network ethberry_besu
