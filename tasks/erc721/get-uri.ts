import { task } from "hardhat/config";

task("erc721-get-uri", "Prints a token's uri")
  .addParam("contract", "Contract address")
  .addParam("id", "Token id")
  .setAction(async (args, hre) => {
    const { contract, id } = args;

    const contractInstance = await hre.ethers.getContractAt("ERC721Simple", contract);
    const uri = await contractInstance.tokenURI(id);

    console.info("Token URI:", uri);
  });

// hardhat erc721-get-uri --contract 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --id 1 --network gemunion_besu
