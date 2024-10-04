import { task } from "hardhat/config";
import { parseEther, formatEther } from "ethers";

task("erc721-royalty-info", "Prints a contract's royalty")
  .addParam("contract", "Contract address")
  .addParam("id", "Token id")
  .setAction(async (args, hre) => {
    const { contract, id } = args;

    const salePrice = parseEther("1.0");

    const contractInstance = await hre.ethers.getContractAt("ERC721Simple", contract);
    const roayltyInfo = await contractInstance.royaltyInfo(id, salePrice);
    const [account, royalty] = roayltyInfo;

    console.info("Token Royalty from 1 ETH:", formatEther(royalty));
    console.info("Token Royalty receiver:", account);
  });

// hardhat erc721-royalty-info --contract 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --id 1 --network gemunion_besu
