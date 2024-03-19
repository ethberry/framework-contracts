import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("balance-erc1155", "Prints an ERC1155 balance")
  .addParam("account", "The account's address")
  .addParam("contract", "The ERC1155 contract's address")
  .setAction(async (args, hre) => {
    const { account, contract } = args;

    const coinInstance = await hre.ethers.getContractAt("ERC1155Simple", contract);
    const accBalance = await coinInstance.balanceOf(account, "16110");

    console.info("ERC1155 Balance:", formatEther(accBalance.toString()));
  });
