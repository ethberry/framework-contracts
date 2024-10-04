import { task } from "hardhat/config";

task("erc1155-mint", "Mints ERC1155 tokens")
  .addParam("contract", "The ERC1155 contract's address")
  .addParam("to", "The account's address")
  .addParam("id", "Template id")
  .addParam("amount", "Amount")
  .setAction(async (args, hre) => {
    const { contract, to, id, amount } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC1155Simple", contract);
    await contractInstance.mint(to, id, amount, "0x");

    console.info(`ERC1155 mint ${id} ${amount}`);
  });

// hardhat erc1155-mint --contract 0x5FbDB2315678afecb367f032d93F642f64180aa3 --to 0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73 --id 1 --amount 1000 --network gemunion_besu
