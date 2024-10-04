import { task } from "hardhat/config";

task("erc20-allowance", "Prints an ERC20 allowance")
  .addParam("contract", "The ERC20 contract's address")
  .addParam("owner", "The account's address")
  .addParam("spender", "The spender's address")
  .setAction(async (args, hre) => {
    const { contract, owner, spender } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC20Simple", contract);
    const allowance = await contractInstance.allowance(owner, spender);
    console.info("ERC20 Allowance:", hre.ethers.formatEther(allowance.toString()));
    process.exit(0);
  });

// hardhat erc20-allowance --account 0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73 --spender 0xfeae27388a65ee984f452f86effed42aabd438fd --contract 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --network gemunion_besu
