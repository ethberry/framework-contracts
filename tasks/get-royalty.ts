import { task } from "hardhat/config";
import { parseEther, formatEther } from "ethers";

task("get-royalty", "Prints a contract's royalty")
  .addParam("contract", "The contract's address")
  .addParam("id", "The token's id")
  .setAction(async (args, hre) => {
    const { contract, id } = args;

    const salePrice = parseEther("1.0");

    const coinInstance = await hre.ethers.getContractAt("ERC721Simple", contract);
    const roayltyInfo = await coinInstance.royaltyInfo(id, salePrice);
    const [account, royalty] = roayltyInfo;

    console.info("Token Royalty from 1 ETH:", formatEther(royalty));
    console.info("Token Royalty receiver:", account);
  });

// hardhat get-uri --contract 0x2f4cf7825f1bd896e9e29ff887fb008c19d9d3b4 --id 1 --network goerli
