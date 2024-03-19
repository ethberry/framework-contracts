import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("balance-erc20", "Prints an ERC20 balance")
  .addParam("account", "The account's address")
  .addParam("contract", "The ERC20 contract's address")
  .setAction(async (args, hre) => {
    const { account, contract } = args;

    const coinInstance = await hre.ethers.getContractAt("ERC20ABCS", contract);
    const accBalance = await coinInstance.balanceOf(account);

    console.info("ERC20 Balance:", formatEther(accBalance.toString()));
  });
