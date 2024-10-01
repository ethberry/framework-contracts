import { task } from "hardhat/config";

task("get-uri", "Prints a token's uri")
  .addParam("contract", "The contract's address")
  .addParam("id", "The token's id")
  .setAction(async (args, hre) => {
    const { contract, id } = args;

    const coinInstance = await hre.ethers.getContractAt("ERC721Simple", contract);
    const uri = await coinInstance.tokenURI(id);

    console.info("Token URI:", uri);
  });

// hardhat get-uri --contract 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --id 1 --network goerli
