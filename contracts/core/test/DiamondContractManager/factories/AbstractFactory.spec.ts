import { expect } from "chai";
import { ethers } from "hardhat";
import { getAddress } from "ethers";

import {
  baseTokenURI,
  METADATA_ROLE,
  MINTER_ROLE,
  nonce,
  royalty,
  tokenName,
  tokenSymbol,
} from "@gemunion/contracts-constants";

import { contractTemplate, externalId } from "../../constants";
import { buildBytecode, buildCreate2Address } from "../../utils";
import { deployDiamond } from "../shared/fixture";

describe("AbstractFactoryFacet", function () {
  const factory = async (facetName = "ERC721FactoryFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondCM",
      [facetName, "UseFactoryFacet", "AccessControlFacet", "PausableFacet"],
      "DiamondCMInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  describe("addFactory", function () {
    it("should add roles to deployer", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("ERC721Simple");

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
            { name: "args", type: "Erc721Args" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          Erc721Args: [
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

      const factoryInstance = await ethers.getContractAt("UseFactoryFacet", await contractInstance.getAddress());
      await factoryInstance.addFactory(receiver, METADATA_ROLE);
      await factoryInstance.addFactory(receiver, MINTER_ROLE);

      const tx = await contractInstance.deployERC721Token(
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

      const buildByteCode = buildBytecode(
        ["string", "string", "uint256", "string"],
        [tokenName, tokenSymbol, royalty, baseTokenURI],
        bytecode,
      );
      const address = getAddress(buildCreate2Address(await contractInstance.getAddress(), nonce, buildByteCode));

      await expect(tx)
        .to.emit(contractInstance, "ERC721TokenDeployed")
        .withArgs(address, externalId, [tokenName, tokenSymbol, royalty, baseTokenURI, contractTemplate]);

      const erc721Instance = await ethers.getContractAt("ERC721Simple", address);

      const hasRole1 = await erc721Instance.hasRole(MINTER_ROLE, receiver);
      expect(hasRole1).to.equal(true);

      const hasRole2 = await erc721Instance.hasRole(METADATA_ROLE, receiver);
      expect(hasRole2).to.equal(true);
    });
  });
});
