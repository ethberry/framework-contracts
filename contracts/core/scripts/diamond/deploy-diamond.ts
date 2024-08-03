import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.info("Deploying contracts with the account:", deployer.address);

  const Deployer = await ethers.getContractFactory("Deployer");
  const deployerContract = await Deployer.deploy();
  await deployerContract.waitForDeployment();
  console.info("Deployer contract deployed to:", deployerContract.target);

  // Define the salt and deployment parameters
  const salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"; // Replace with your salt
  const owner = "0x5AB070C173757bba08e9cB9dfa124b79db8D65c8"; // Replace with your contract owner address
  const diamondCutFacet = "0x2e84c076C83BDcBE586Be6EFfe2c941a24e291A7"; // Replace with your diamond cut facet address

  // Predict the address
  const predictedAddress = await deployerContract.getAddress(salt, owner, diamondCutFacet);
  console.info("Predicted DiamondExchange address:", predictedAddress);

  // Deploy the DiamondExchange contract
  const deployTx = await deployerContract.deploy(salt, owner, diamondCutFacet);
  await deployTx.wait();
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
