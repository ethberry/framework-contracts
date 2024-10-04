import { task } from "hardhat/config";

import { baseTokenURI, royalty } from "@gemunion/contracts-constants";

task("erc1155-deploy", "Deploys ERC1155 contract").setAction(async (_, hre) => {
  const coinFactory = await hre.ethers.getContractFactory("ERC1155Simple");
  const contractInstance = await coinFactory.deploy(royalty, baseTokenURI);
  console.info(`ERC1155 deployed to ${await contractInstance.getAddress()}`);
});

// hardhat erc1155-deploy --network gemunion_besu
