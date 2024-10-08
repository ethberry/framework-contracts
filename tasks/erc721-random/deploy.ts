import { task } from "hardhat/config";

import { baseTokenURI, royalty } from "@ethberry/contracts-constants";
import { getContractName } from "../../test/utils";

task("erc721-deploy-random", "Deploys ERC721 contract").setAction(async (_, hre) => {
  const networkName = hre.network.name;

  const contractFactory = await hre.ethers.getContractFactory(getContractName("ERC721Random", networkName));
  const contractInstance = await contractFactory.deploy("NFT", "EBT721", royalty, baseTokenURI);

  console.info(`ERC721 deployed to ${await contractInstance.getAddress()}`);
});

// hardhat erc721-deploy-random --network ethberry_besu
