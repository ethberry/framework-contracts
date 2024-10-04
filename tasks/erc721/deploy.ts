import { task } from "hardhat/config";

import { baseTokenURI, royalty } from "@gemunion/contracts-constants";

task("erc721-deploy", "Deploys ERC721 contract").setAction(async (_, hre) => {
  const coinFactory = await hre.ethers.getContractFactory("ERC721Simple");
  const contractInstance = await coinFactory.deploy("NFT", "GEM721", royalty, baseTokenURI);
  console.info(`ERC721 deployed to ${await contractInstance.getAddress()}`);
});

// hardhat erc721-deploy --network gemunion_besu
