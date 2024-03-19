import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("balance-eth", "Prints an ETH balance")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const { account } = args;

    const balance = await hre.ethers.provider.getBalance(account);
    console.info("ETH Balance:", formatEther(balance), "ETH");
  });
