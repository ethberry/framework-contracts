import { task } from "hardhat/config";
import { formatEther } from "ethers";

task("erc1155-balance-of", "Prints an ERC1155 balance")
  .addParam("contract", "The ERC1155 contract's address")
  .addParam("account", "The account's address")
  .addParam("id", "Token id")
  .setAction(async (args, hre) => {
    const { contract, account, tokenId } = args;

    const coinInstance = await hre.ethers.getContractAt("ERC1155Simple", contract);
    const accBalance = await coinInstance.balanceOf(account, tokenId);

    console.info("ERC1155 Balance:", formatEther(accBalance.toString()));
  });

// hardhat erc1155-balance-of --contract 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --account 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --id 1 --network ethberry_besu
