import { task } from "hardhat/config";
import { id } from "ethers";

task("access-grant-role", "Grants address a role to contract")
  .addParam("contract", "Contract address")
  .addParam("role", "Role")
  .addParam("account", "Contract address")
  .setAction(async (args, hre) => {
    const { contract, role, account } = args;
    const contractInstance = await hre.ethers.getContractAt("AccessControl", contract);
    const tx = await contractInstance.grantRole(id(role), account);
    console.info("Role granted, tx:", tx.hash);
  });

// hardhat access-grant-role --contract 0x4fc5a9628132cea372add62c846cd817ef46bbf5 --address 0x6cec229d5b711a0f1ad6772a4d568e54b036b321 --network ethberry_besu
