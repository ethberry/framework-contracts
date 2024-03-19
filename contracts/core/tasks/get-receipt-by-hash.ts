import { task } from "hardhat/config";

task("get-receipt-by-hash", "Get transaction receipt")
  .addParam("tx", "transaction hash")
  .setAction(async (args, hre) => {
    const { tx } = args;

    const txReceipt = await hre.ethers.provider.getTransaction(tx);

    console.info(txReceipt);
  });

// hardhat get-receipt-by-hash --network besu --tx 0x68458b479a1f6e9c85001181384bdfeb58084b5b82eb3b524cdcac2f8d6a02fd
