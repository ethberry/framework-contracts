import { task } from "hardhat/config";
import { WeiPerEther } from "ethers";

task("erc20-mint", "Mints ERC20 tokens")
  .addParam("contract", "The ERC20 contract's address")
  .addParam("account", "The account's address")
  .addOptionalParam("value", "Amount")
  .setAction(async (args, hre) => {
    const { contract, account, value = 1_000_000n } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC20Simple", contract);
    await contractInstance.mint(account, WeiPerEther * value);

    console.info("ERC20 mint");
  });

// hardhat erc20-mint --contract 0xfeae27388a65ee984f452f86effed42aabd438fd --value 100000 --network gemunion_besu
