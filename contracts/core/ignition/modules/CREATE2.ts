import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const owner = "0x5AB070C173757bba08e9cB9dfa124b79db8D65c8"; // Replace with your contract owner address
const diamondCutFacet = "0x2e84c076C83BDcBE586Be6EFfe2c941a24e291A7"; // Replace with your diamond cut facet address

const DeployerModule = buildModule("LockModule", m => {
  const deployer = m.contract("DiamondExchange", [owner, diamondCutFacet], {});

  return { deployer };
});

export default DeployerModule;
