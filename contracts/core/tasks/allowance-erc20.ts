import { task } from "hardhat/config";

task("allowance-erc20", "Prints an ERC20 balance")
  .addParam("account", "The account's address")
  .addParam("spender", "The spender's address")
  .addParam("contract", "The ERC20 contract's address")
  .setAction(async (args, hre) => {
    const { account, spender, contract } = args;

    const coinFactory = await hre.ethers.getContractFactory("ERC20Simple");
    const coinInstance = coinFactory.attach(contract);
    const allowance = await coinInstance.allowance(account, spender);
    console.info("ERC20 Allowance:", hre.ethers.utils.formatEther(allowance.toString()));
    process.exit(0);
  });

// hardhat allowance-erc20 --account 0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73 --spender 0xfeae27388a65ee984f452f86effed42aabd438fd --contract 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --network besu
