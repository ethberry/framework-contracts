import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ZeroAddress, ZeroHash } from "ethers";

import { amount, MINTER_ROLE, nonce } from "@gemunion/contracts-constants";

import { deployDiamond } from "./shared";
import { expiresAt, externalId, extra } from "../constants";
import { isEqualEventArgArrObj } from "../utils";
import { wrapManyToManySignature, wrapOneToManySignature, wrapOneToOneSignature } from "./shared/utils";
import { deployERC1363 } from "../ERC20/shared/fixtures";
import { deployVesting } from "../Mechanics/Vesting/shared/fixture";

describe("Diamond Exchange Purchase Vesting", function () {
  const factory = async (facetName = "ExchangePurchaseVestingFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };
  const factoryVesting = () => deployVesting("Vesting", 12, 417);

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const generateOneToOneSignature = wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
    const generateOneToManySignature = wrapOneToManySignature(network, contractInstance, "EXCHANGE", owner);
    const generateManyToManySignature = wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);

    return {
      generateOneToOneSignature,
      generateOneToManySignature,
      generateManyToManySignature,
    };
  };

  describe("exchange purchase", function () {
    it("should purchase Vesting for ERC20 (no ref)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseVesting")
        .withArgs(
          receiver.address,
          await vestingInstance.getAddress(),
          externalId,
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );
      await expect(tx1).not.to.emit(exchangeInstance, "ReferralEvent");
    });

    it("should purchase Vesting for ERC20 (ref)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: owner.address,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: owner.address,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseVesting")
        .withArgs(
          receiver.address,
          await vestingInstance.getAddress(),
          externalId,
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        )
        .to.emit(exchangeInstance, "ReferralEvent")
        .withArgs(
          receiver,
          owner.address,
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );
    });

    it("should fail: not approved", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(vestingInstance, "OwnableUnauthorizedAccount");
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await exchangeInstance.getAddress());
      await accessInstance.renounceRole(MINTER_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: ERC20InsufficientAllowance", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
        .withArgs(await exchangeInstance.getAddress(), 0, amount);
    });

    it("should fail: ECDSAInvalidSignatureLength", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        ZeroHash,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignatureLength");
    });

    // TODO add more tests as in purchase facet
  });

  describe("ERROR", function () {
    it("should fail: receiver not exist", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "NotExist");
    });

    it("should fail: EnforcedPause", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const vestingInstance = await factoryVesting();

      const tx0 = vestingInstance.approve(await exchangeInstance.getAddress());
      await expect(tx0)
        .to.emit(vestingInstance, "Approval")
        .withArgs(owner.address, await exchangeInstance.getAddress());

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const pausableInstance = await ethers.getContractAt("PausableFacet", await exchangeInstance.getAddress());
      await pausableInstance.pause();

      const tx1 = exchangeInstance.connect(receiver).purchaseVesting(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        {
          tokenType: 0,
          token: await vestingInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
