import { task } from "hardhat/config";
import { MINTER_ROLE } from "@gemunion/contracts-constants";

task("grant", "Grants address a role to contract")
  .addParam("contract", "The contract's address")
  .addParam("address", "The contract's address")
  .setAction(async (args, hre) => {
    const { contract, address } = args;

    const contractInstance = await hre.ethers.getContractAt("LotteryRandom", contract);

    const tx = await contractInstance.grantRole(MINTER_ROLE, address);

    console.info("Role granted, tx:", tx.hash);
  });

// hardhat grant --contract 0x4fc5a9628132cea372add62c846cd817ef46bbf5 --address 0x6cec229d5b711a0f1ad6772a4d568e54b036b321 --network besu
