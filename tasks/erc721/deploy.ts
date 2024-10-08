import { task } from "hardhat/config";

import { baseTokenURI, royalty } from "@ethberry/contracts-constants";

task("erc721-deploy", "Deploys ERC721 contract").setAction(async (_, hre) => {
  const contractFactory = await hre.ethers.getContractFactory("ERC721Simple");
  const contractInstance = await contractFactory.deploy("NFT", "GEM721", royalty, baseTokenURI);

  console.info(`ERC721 deployed to ${await contractInstance.getAddress()}`);
});

// hardhat erc721-deploy --network ethberry_besu
