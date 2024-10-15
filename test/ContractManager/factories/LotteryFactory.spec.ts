import { expect } from "chai";
import { ethers } from "hardhat";
import { getCreate2Address } from "ethers";

import { DEFAULT_ADMIN_ROLE, nonce } from "@ethberry/contracts-constants";

import { getContractName, getInitCodeHash } from "../../utils";
import { externalId } from "../../constants";
import { deployDiamond } from "../../Exchange/shared";

describe("LotteryFactoryDiamoond", function () {
  const factory = async (facetName = "LotteryFactoryFacet"): Promise<any> => {
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

  describe("deployLottery", function () {
    it("should deploy contract", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("Lottery", network.name));

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
            { name: "args", type: "LotteryArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          LotteryArgs: [{ name: "config", type: "LotteryConfig" }],
          LotteryConfig: [
            { name: "timeLagBeforeRelease", type: "uint256" },
            { name: "commission", type: "uint256" },
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
            config: {
              timeLagBeforeRelease: 100,
              commission: 30,
            },
          },
        },
      );

      const tx = contractInstance.deployLottery(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          config: {
            timeLagBeforeRelease: 100,
            commission: 30,
          },
        },
        signature,
      );

      const initCodeHash = getInitCodeHash(["uint256", "uint256"], [100, 30], bytecode);
      const address = getCreate2Address(await contractInstance.getAddress(), nonce, initCodeHash);

      await expect(tx)
        .to.emit(contractInstance, "LotteryDeployed")
        .withArgs(address, externalId, [["100", "30"]]);

      const lotteryInstance = await ethers.getContractAt(getContractName("Lottery", network.name), address);

      const hasRole1 = await lotteryInstance.hasRole(DEFAULT_ADMIN_ROLE, contractInstance);
      expect(hasRole1).to.equal(false);

      const hasRole2 = await lotteryInstance.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
      expect(hasRole2).to.equal(true);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      const { bytecode } = await ethers.getContractFactory(getContractName("Lottery", network.name));

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
            { name: "args", type: "LotteryArgs" },
          ],
          Params: [
            { name: "nonce", type: "bytes32" },
            { name: "bytecode", type: "bytes" },
            { name: "externalId", type: "uint256" },
          ],
          LotteryArgs: [{ name: "config", type: "LotteryConfig" }],
          LotteryConfig: [
            { name: "timeLagBeforeRelease", type: "uint256" },
            { name: "commission", type: "uint256" },
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
            config: {
              timeLagBeforeRelease: 100,
              commission: 30,
            },
          },
        },
      );

      const accessInstance = await ethers.getContractAt("AccessControlFacet", contractInstance);
      await accessInstance.renounceRole(DEFAULT_ADMIN_ROLE, owner.address);

      const tx = contractInstance.deployLottery(
        {
          nonce,
          bytecode,
          externalId,
        },
        {
          config: {
            timeLagBeforeRelease: 100,
            commission: 30,
          },
        },
        signature,
      );

      await expect(tx).to.be.revertedWithCustomError(contractInstance, "SignerMissingRole");
    });
  });
});
