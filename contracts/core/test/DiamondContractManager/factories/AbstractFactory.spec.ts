import { expect } from "chai";
import { ethers } from "hardhat";
import { getAddress } from "ethers";

import {
  baseTokenURI,
  batchSize,
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
  const factory = async (facetName = "CollectionFactoryFacet"): Promise<any> => {
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

  describe("deployCollection", function () {
    it("should deploy a collection", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("ERC721Simple");

      const contractInstance = await factory();
      const verifyingContract = await contractInstance.getAddress();

      const signature = await owner.signTypedData(
        {
          name: "CONTRACT_MANAGER",
          version: "1.0.0",
          chainId: network.chainId,
          verifyingContract,
        },
        {
          EIP712: [
            { name: "params", type: "Params" },
            { name: "args", type: "CollectionArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          CollectionArgs: [
            { name: "name", type: "string" },
            { name: "symbol", type: "string" },
            { name: "royalty", type: "uint96" },
            { name: "baseTokenURI", type: "string" },
            { name: "batchSize", type: "uint96" },
            { name: "contractTemplate", type: "string" },
          ],
        },
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
            batchSize,
            contractTemplate,
          },
        },
      );

      const factoryInstance = await ethers.getContractAt("UseFactoryFacet", await contractInstance.getAddress());
      await factoryInstance.addFactory(receiver, METADATA_ROLE);
      await factoryInstance.addFactory(receiver, MINTER_ROLE);

      const tx = await contractInstance.deployCollection(
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
          batchSize,
          contractTemplate,
        },
        signature,
      );

      const buildByteCode = buildBytecode(
        ["string", "string", "uint256", "string", "uint256", "address"],
        [tokenName, tokenSymbol, royalty, baseTokenURI, batchSize, owner.address],
        bytecode,
      );
      const address = getAddress(buildCreate2Address(await contractInstance.getAddress(), nonce, buildByteCode));

      await expect(tx)
        .to.emit(contractInstance, "CollectionDeployed")
        .withArgs(address, externalId, [tokenName, tokenSymbol, royalty, baseTokenURI, batchSize, contractTemplate]);

      const collectionInstance = await ethers.getContractAt("ERC721Simple", address);

      const hasRole1 = await collectionInstance.hasRole(MINTER_ROLE, receiver);
      expect(hasRole1).to.equal(true);

      const hasRole2 = await collectionInstance.hasRole(METADATA_ROLE, receiver);
      expect(hasRole2).to.equal(true);
    });
  });
});
