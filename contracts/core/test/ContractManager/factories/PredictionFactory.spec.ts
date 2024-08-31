import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address, keccak256 } from "ethers";

import { DEFAULT_ADMIN_ROLE, nonce } from "@gemunion/contracts-constants";

import { contractTemplate, externalId } from "../../constants";
import { deployDiamond } from "../shared/fixture";

describe("PredictionFactoryDiamond", function () {
  const factory = async (facetName = "PredictionFactoryFacet"): Promise<any> => {
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

  describe("deployPrediction", function () {
    it("should deploy contract", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("Prediction");

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
          EIP712: [
            { name: "params", type: "Params" },
            { name: "args", type: "PredictionArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          PredictionArgs: [{ name: "contractTemplate", type: "string" }],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            payees: [owner.address],
            shares: [1],
            contractTemplate,
          },
        },
      );

      const tx = contractInstance.deployPrediction(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          contractTemplate,
        },
        signature,
      );

      const initCodeHash = keccak256(bytecode);
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx)
        .to.emit(contractInstance, "PredictionDeployed")
        .withArgs(address, externalId, [contractTemplate]);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("Prediction");

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
          EIP712: [
            { name: "params", type: "Params" },
            { name: "args", type: "PredictionArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          PredictionArgs: [{ name: "contractTemplate", type: "string" }],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            contractTemplate,
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployPrediction(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          payees: [owner.address],
          shares: [1],
          contractTemplate,
        },
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
