import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address } from "ethers";

import {
  baseTokenURI,
  DEFAULT_ADMIN_ROLE,
  nonce,
  royalty,
  tokenName,
  tokenSymbol
} from "@ethberry/contracts-constants";

import { contractTemplate, externalId } from "../../constants";
import { getContractName, getInitCodeHash } from "../../utils";
import { deployDiamond } from "../../Exchange/shared";

describe("LootBoxFactoryDiamond", function () {
  const factory = async (facetName = "LootBoxFactoryFacet"): Promise<any> => {
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

  describe("deployLootToken", function () {
    it("should deploy contract", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("ERC721LootBoxSimple", network.name));

      const contractInstance = await factory();

      const signature = await owner.signTypedData(
        // Domain
        {
          name: "CONTRACT_MANAGER",
          version: "1.0.0",
          chainId: network.chainId,
          verifyingContract: await contractInstance.getAddress(),
        },
        // Types
        {
          EIP712: [
            { name: "params", type: "Params" },
            { name: "args", type: "LootArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          LootArgs: [
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
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
            name: tokenName,
            symbol: tokenSymbol,
            royalty,
            baseTokenURI,
            contractTemplate,
          },
        },
      );

      const tx = contractInstance.deployLootBox(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          name: tokenName,
          symbol: tokenSymbol,
          royalty,
          baseTokenURI,
          contractTemplate,
        },
        signature,
      );

      const initCodeHash = getInitCodeHash(
        ["string", "string", "uint256", "string"],
        [tokenName, tokenSymbol, royalty, baseTokenURI],
        bytecode,
      );
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx)
        .to.emit(contractInstance, "LootBoxDeployed")
        .withArgs(address, externalId, [tokenName, tokenSymbol, royalty, baseTokenURI, contractTemplate]);

      const erc721Instance = await ethers.getContractAt(getContractName("ERC721LootBoxSimple", network.name), address);

      const hasRole1 = await erc721Instance.hasRole(DEFAULT_ADMIN_ROLE, contractInstance);
      expect(hasRole1).to.equal(false);

      const hasRole2 = await erc721Instance.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole2).to.equal(true);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("ERC721LootBoxSimple", network.name));

      const contractInstance = await factory();

      const signature = await owner.signTypedData(
        // Domain
        {
          name: "CONTRACT_MANAGER",
          version: "1.0.0",
          chainId: network.chainId,
          verifyingContract: await contractInstance.getAddress(),
        },
        // Types
        {
          EIP712: [
            { name: "params", type: "Params" },
            { name: "args", type: "LootArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          LootArgs: [
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
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
            name: tokenName,
            symbol: tokenSymbol,
            royalty,
            baseTokenURI,
            contractTemplate,
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await contractInstance.getAddress());
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployLootBox(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          name: tokenName,
          symbol: tokenSymbol,
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
