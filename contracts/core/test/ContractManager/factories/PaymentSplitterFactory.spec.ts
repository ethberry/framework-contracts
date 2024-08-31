import { expect } from "chai";
import { ethers } from "hardhat";
import { getAddress } from "ethers";

import { DEFAULT_ADMIN_ROLE, nonce } from "@gemunion/contracts-constants";

import { externalId } from "../../constants";
import { buildBytecode, buildCreate2Address, recursivelyDecodeResult } from "../../utils";
import { deployDiamond } from "../shared/fixture";

describe("PaymentSplitterDiamoond", function () {
  const factory = async (facetName = "PaymentSplitterFactoryFacet"): Promise<any> => {
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

  describe("deployPaymentSplitter", function () {
    it("should deploy contract", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("GemunionSplitter");

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
            { name: "args", type: "PaymentSplitterArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          PaymentSplitterArgs: [
            { name: "payees", type: "address[]" },
            { name: "shares", type: "uint256[]" },
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
            payees: [owner.address, receiver.address],
            shares: [50, 50],
          },
        },
      );

      const tx = contractInstance.deployPaymentSplitter(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          payees: [owner.address, receiver.address],
          shares: [50, 50],
        },
        signature,
      );

      const buildByteCode = buildBytecode(
        ["address[]", "uint256[]"],
        [
          [owner.address, receiver.address],
          [50, 50],
        ],
        bytecode,
      );
      const address = getAddress(buildCreate2Address(await contractInstance.getAddress(), nonce, buildByteCode));

      await expect(tx).to.emit(contractInstance, "PaymentSplitterDeployed");

      const eventFilter = contractInstance.filters.PaymentSplitterDeployed();
      const events = await contractInstance.queryFilter(eventFilter);
      const { args } = events[0];
      const decodedArgs = recursivelyDecodeResult(args);
      expect(decodedArgs.account).to.equal(address);
      expect(decodedArgs.externalId).to.equal(1n);
      expect(decodedArgs.args.payees).to.deep.equal([owner.address, receiver.address]);
      expect(decodedArgs.args.shares).to.deep.equal([50n, 50n]);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("GemunionSplitter");

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
            { name: "args", type: "PaymentSplitterArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          PaymentSplitterArgs: [
            { name: "payees", type: "address[]" },
            { name: "shares", type: "uint256[]" },
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
            payees: [owner.address, receiver.address],
            shares: [50, 50],
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployPaymentSplitter(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          payees: [owner.address, receiver.address],
          shares: [50, 50],
        },
        signature,
      );
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
