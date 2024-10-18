import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("balance-native", "Prints an ETH balance")
  .addParam("account", "The account's address")
  .setAction(async (args, hre) => {
    const { account } = args;

    const balance = await hre.ethers.provider.getBalance(account);
    console.info("ETH Balance:", formatEther(balance), "ETH");
  });

// hardhat balance-native --account 0xfe3b557e8fb62b89f4916b721be55ceb828dbd73 --network ethberry_besu
