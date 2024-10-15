import { expect } from "chai";
import { ethers } from "hardhat";
import { concat, getCreate2Address, toBeHex, ZeroAddress, zeroPadValue } from "ethers";
import { time } from "@openzeppelin/test-helpers";

import { amount, DEFAULT_ADMIN_ROLE, nonce } from "@ethberry/contracts-constants";
import { decodeTraits } from "@ethberry/traits-v6";
import { deployERC20Mock } from "@ethberry/contracts-mocks";

import { getInitCodeHash, isEqualEventArgArrObj, isEqualEventArgObj } from "../../utils";
import { claimId, contractTemplate, externalId, tokenId, userId } from "../../constants";
import { deployDiamond } from "../../Exchange/shared";

describe("VestingFactoryDiamond", function () {
  const factory = async (facetName = "VestingFactoryFacet"): Promise<any> => {
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

  describe("deployVesting", function () {
    // TODO deploy with ETH

    it("should deploy contract (ERC20)", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("Vesting");

      const contractInstance = await factory();

      const erc20Instance = await deployERC20Mock();
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(contractInstance, amount);

      const current = await time.latest();

      const encodedExternalId = concat([zeroPadValue(toBeHex(userId), 3), zeroPadValue(toBeHex(claimId), 4)]);

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
            { name: "args", type: "VestingArgs" },
            { name: "items", type: "Asset[]" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          VestingArgs: [
            { name: "owner", type: "address" },
            { name: "startTimestamp", type: "uint64" },
            { name: "cliffInMonth", type: "uint16" },
            { name: "monthlyRelease", type: "uint16" },
            { name: "contractTemplate", type: "string" },
          ],
          Asset: [
            { name: "tokenType", type: "uint256" },
            { name: "token", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "amount", type: "uint256" },
          ],
        },
        // Values
        {
          params: {
            nonce,
            bytecode,
            externalId: encodedExternalId,
          },
          args: {
            owner: owner.address,
            startTimestamp: current.toNumber(),
            cliffInMonth: 12,
            monthlyRelease: 417,
            contractTemplate,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        },
      );

      const tx = contractInstance.deployVesting(
        {
          nonce,
          bytecode,
          externalId: encodedExternalId,
        },
        {
          owner: owner.address,
          startTimestamp: current.toNumber(),
          cliffInMonth: 12,
          monthlyRelease: 417,
          contractTemplate,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        signature,
      );

      const initCodeHash = getInitCodeHash(
        ["address", "uint256", "uint256", "uint256"],
        [owner.address, current.toNumber(), 12, 417],
        bytecode,
      );
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx)
        .to.emit(contractInstance, "VestingDeployed")
        .withArgs(
          address,
          encodedExternalId,
          isEqualEventArgObj({
            owner: owner.address,
            startTimestamp: current.toString(),
            cliffInMonth: "12",
            monthlyRelease: "417",
            contractTemplate,
          }),
          isEqualEventArgArrObj({
            tokenType: "1",
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          }),
        );

      const decoded = decodeTraits(BigInt(encodedExternalId), ["user", "claim"]);
      expect(decoded.claim).to.equal(claimId);
      expect(decoded.user).to.equal(userId);

      await expect(tx).changeTokenBalances(erc20Instance, [owner, address], [-amount, amount]);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("Vesting");

      const contractInstance = await factory();

      const erc20Instance = await deployERC20Mock();
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(contractInstance, amount);

      const current = await time.latest();
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
            { name: "args", type: "VestingArgs" },
            { name: "items", type: "Asset[]" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          VestingArgs: [
            { name: "owner", type: "address" },
            { name: "startTimestamp", type: "uint64" },
            { name: "cliffInMonth", type: "uint16" },
            { name: "monthlyRelease", type: "uint16" },
            { name: "contractTemplate", type: "string" },
          ],
          Asset: [
            { name: "tokenType", type: "uint256" },
            { name: "token", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "amount", type: "uint256" },
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
            owner: owner.address,
            startTimestamp: current.toNumber(),
            cliffInMonth: 12,
            monthlyRelease: 417,
            contractTemplate,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployVesting(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          owner: owner.address,
          startTimestamp: current.toNumber(),
          cliffInMonth: 12,
          monthlyRelease: 417,
          contractTemplate,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });

    it("should fail: UnsupportedTokenType", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory("Vesting");

      const diamondInstance = await factory();
      const verifyingContract = await diamondInstance.getAddress();
      const contractInstance = await ethers.getContractAt("VestingFactoryFacet", verifyingContract);

      const current = await time.latest();
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
            { name: "args", type: "VestingArgs" },
            { name: "items", type: "Asset[]" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          VestingArgs: [
            { name: "owner", type: "address" },
            { name: "startTimestamp", type: "uint64" },
            { name: "cliffInMonth", type: "uint16" },
            { name: "monthlyRelease", type: "uint16" },
            { name: "contractTemplate", type: "string" },
          ],
          Asset: [
            { name: "tokenType", type: "uint256" },
            { name: "token", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "amount", type: "uint256" },
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
            owner: owner.address,
            startTimestamp: current.toNumber(),
            cliffInMonth: 12,
            monthlyRelease: 417,
            contractTemplate,
          },
          items: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
        },
      );

      const tx = contractInstance.deployVesting(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          owner: owner.address,
          startTimestamp: current.toNumber(),
          cliffInMonth: 12,
          monthlyRelease: 417,
          contractTemplate,
        },
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "UnsupportedTokenType");
    });
  });
});
