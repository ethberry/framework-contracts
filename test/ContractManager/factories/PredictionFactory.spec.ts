import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address } from "ethers";

import { DEFAULT_ADMIN_ROLE, nonce } from "@ethberry/contracts-constants";

import { externalId } from "../../constants";
import { deployDiamond } from "../../Exchange/shared";
import { getInitCodeHash } from "../../utils";

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
          PredictionArgs: [{ name: "config", type: "PredictionConfig" }],
          PredictionConfig: [{ name: "treasuryFee", type: "uint256" }],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            config: {
              treasuryFee: 100,
            },
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
          config: {
            treasuryFee: 100,
          },
        },
        signature,
      );

      const initCodeHash = getInitCodeHash(["uint256"], [100], bytecode);
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx)
        .to.emit(contractInstance, "PredictionDeployed")
        .withArgs(address, externalId, [["100"]]);

      const predictionInstance = await ethers.getContractAt("Prediction", address);

      const hasRole1 = await predictionInstance.hasRole(DEFAULT_ADMIN_ROLE, contractInstance);
      expect(hasRole1).to.equal(false);

      const hasRole2 = await predictionInstance.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole2).to.equal(true);
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
          PredictionArgs: [{ name: "config", type: "PredictionConfig" }],
          PredictionConfig: [{ name: "treasuryFee", type: "uint256" }],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            config: {
              treasuryFee: 100,
            },
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
          config: {
            treasuryFee: 100,
          },
        },
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
