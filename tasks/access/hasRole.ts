import { task } from "hardhat/config";
import { id } from "ethers";

task("access-has-role", "Returns `true` if `account` has been granted `role`")
  .addParam("contract", "Contract address")
  .addParam("role", "Role")
  .addParam("account", "The users address")
  .setAction(async (args, hre) => {
    const { contract, role, account } = args;
    const contractInstance = await hre.ethers.getContractAt("AccessControl", contract);
    const hasRole = await contractInstance.hasRole(id(role), account);
    console.info("Has role:", hasRole);
    process.exit(0);
  });

// hardhat access-has-role --contract 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --role MINTER_ROLE --account 0x5e98e8a494ab6ce0a09d3b4c76534e7e00faed71 --network ethberry_besu
