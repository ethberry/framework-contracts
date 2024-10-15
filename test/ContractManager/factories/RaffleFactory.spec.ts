import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address, keccak256 } from "ethers";

import { DEFAULT_ADMIN_ROLE, nonce } from "@ethberry/contracts-constants";

import { getContractName } from "../../utils";
import { externalId } from "../../constants";
import { deployDiamond } from "../../Exchange/shared";

describe("RaffleFactoryDiamond", function () {
  const factory = async (facetName = "RaffleFactoryFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondCM",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondCMInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, diamondInstance);
  };

  describe("deployRaffle", function () {
    it("should deploy contract", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const contractInstance = await factory();
      const verifyingContract = await contractInstance.getAddress();

      const signature = await owner.signTypedData(
        // Domain
        {
          name: "CONTRACT_MANAGER",
          version: "1.0.0",
          chainId: network.chainId,
          verifyingContract,
        },
        // Types
        {
          EIP712: [{ name: "params", type: "Params" }],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
        },
      );

      const tx = contractInstance.deployRaffle(
        {
          nonce,
          bytecode,
          externalId,
        },
        signature,
      );

      const initCodeHash = keccak256(bytecode);
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx).to.emit(contractInstance, "RaffleDeployed").withArgs(address, externalId);

      const raffleInstance = await ethers.getContractAt(getContractName("Raffle", network.name), address);

      const hasRole1 = await raffleInstance.hasRole(DEFAULT_ADMIN_ROLE, contractInstance);
      expect(hasRole1).to.equal(false);

      const hasRole2 = await raffleInstance.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole2).to.equal(true);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const contractInstance = await factory();
      const verifyingContract = await contractInstance.getAddress();

      const signature = await owner.signTypedData(
        // Domain
        {
          name: "CONTRACT_MANAGER",
          version: "1.0.0",
          chainId: network.chainId,
          verifyingContract,
        },
        // Types
        {
          EIP712: [{ name: "params", type: "Params" }],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployRaffle(
        {
          nonce,
          bytecode,
          externalId,
        },
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
