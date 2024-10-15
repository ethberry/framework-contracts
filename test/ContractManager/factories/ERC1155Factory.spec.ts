import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address } from "ethers";

import { baseTokenURI, DEFAULT_ADMIN_ROLE, nonce, royalty } from "@ethberry/contracts-constants";

import { contractTemplate, externalId } from "../../constants";
import { getInitCodeHash } from "../../utils";
import { deployDiamond } from "../../Exchange/shared";

describe("ERC1155FactoryDiamoond", function () {
  const factory = async (facetName = "ERC1155FactoryFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondCM",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondCMInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  describe("deployERC1155Token", function () {
    it("should deploy contract", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("ERC1155Simple");

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
            { name: "args", type: "Erc1155Args" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          Erc1155Args: [
            { name: "royalty", type: "uint96" },
            { name: "baseTokenURI", type: "string" },
            { name: "contractTemplate", type: "string" },
          ],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            royalty,
            baseTokenURI,
            contractTemplate,
          },
        },
      );

      const tx = contractInstance.deployERC1155Token(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          royalty,
          baseTokenURI,
          contractTemplate,
        },
        signature,
      );

      const initCodeHash = getInitCodeHash(["uint256", "string"], [royalty, baseTokenURI], bytecode);
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);
      await expect(tx)
        .to.emit(contractInstance, "ERC1155TokenDeployed")
        .withArgs(address, externalId, [royalty, baseTokenURI, contractTemplate]);

      const erc1155Instance = await ethers.getContractAt("ERC1155Simple", address);

      const hasRole1 = await erc1155Instance.hasRole(DEFAULT_ADMIN_ROLE, contractInstance);
      expect(hasRole1).to.equal(false);

      const hasRole2 = await erc1155Instance.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole2).to.equal(true);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("ERC1155Simple");

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
            { name: "args", type: "Erc1155Args" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          Erc1155Args: [
            { name: "royalty", type: "uint96" },
            { name: "baseTokenURI", type: "string" },
            { name: "contractTemplate", type: "string" },
          ],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId,
          },
          args: {
            royalty,
            baseTokenURI,
            contractTemplate,
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployERC1155Token(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          royalty,
          baseTokenURI,
          contractTemplate,
        },
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
