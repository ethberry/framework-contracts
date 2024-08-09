import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, toBeHex, ZeroAddress, ZeroHash, zeroPadValue } from "ethers";

import { amount, METADATA_ROLE, nonce } from "@gemunion/contracts-constants";

import { isEqualArray, isEqualEventArgArrObj, isEqualEventArgObj } from "../utils";
import { deployERC1363 } from "../ERC20/shared/fixtures";
import { deployDiamond, deployErc721Base, wrapManyToManySignature, wrapOneToManySignature } from "./shared";
import { expiresAt, externalId, params, templateId, tokenId } from "../constants";

describe("Diamond Exchange Rent", function () {
  const factory = async (facetName = "ExchangeRentableFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, diamondInstance);
  };

  describe("rent single", function () {
    const getSignatures = async (contractInstance: Contract) => {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      return wrapOneToManySignature(network, contractInstance, "EXCHANGE", owner);
    };

    it("should lend ERC721 to user for free", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [],
      });

      const tx1 = exchangeInstance.connect(receiver).lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [],
        signature,
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "Lend")
        .withArgs(
          receiver.address,
          stranger.address,
          endTimestamp,
          externalId,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualArray([[]]),
        )
        .to.emit(erc721Instance, "UpdateUser")
        .withArgs(tokenId, stranger.address, endTimestamp);

      const user = await erc721Instance.userOf(tokenId);
      expect(user).to.equal(stranger.address);
      const rentExpires = await erc721Instance.userExpires(tokenId);
      expect(rentExpires).to.equal(endTimestamp);
    });

    it("should lend ERC721 to user for ERC20", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);
      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.changeTokenBalances(erc20Instance, [receiver, owner], [-amount, amount]);
      await expect(tx1)
        .to.emit(exchangeInstance, "Lend")
        .withArgs(
          receiver.address,
          stranger.address,
          endTimestamp,
          externalId,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          }),
        )
        .to.emit(erc721Instance, "UpdateUser")
        .withArgs(tokenId, stranger.address, endTimestamp);

      const user = await erc721Instance.userOf(tokenId);
      expect(user).to.equal(stranger.address);
      const rentExpires = await erc721Instance.userExpires(tokenId);
      expect(rentExpires).to.equal(endTimestamp);
    });

    it("should fail: Wrong signer", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);
      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: stranger.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: signer missing role", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [],
      });

      const accessInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);
      await accessInstance.renounceRole(METADATA_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: ERC721InsufficientApproval", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(exchangeInstance, amount);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: owner.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1)
        .to.be.revertedWithCustomError(erc721Instance, "ERC721InsufficientApproval")
        .withArgs(exchangeInstance, tokenId);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [],
      });

      const accessControlInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);

      await accessControlInstance.renounceRole(METADATA_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).lend(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1,
        },
        [],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });
  });

  describe("lendMany", function () {
    const getSignatures = async (contractInstance: Contract) => {
      const [owner] = await ethers.getSigners();
      const network = await ethers.provider.getNetwork();
      return wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);
    };

    it("should lend ERC721 to user for free", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [],
        extra: expires,
      });
      const tx1 = exchangeInstance.connect(receiver).lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1,
          },
        ],
        [],
        signature,
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "LendMany")
        .withArgs(
          receiver.address,
          stranger.address,
          endTimestamp,
          externalId,
          isEqualEventArgArrObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualArray([[]]),
        )
        .to.emit(erc721Instance, "UpdateUser")
        .withArgs(tokenId, stranger.address, endTimestamp);

      const user = await erc721Instance.userOf(tokenId);
      expect(user).to.equal(stranger.address);
      const rentExpires = await erc721Instance.userExpires(tokenId);
      expect(rentExpires).to.equal(endTimestamp);
    });

    it("should lend ERC721 to user for ERC20", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);
      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1,
          },
        ],
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.changeTokenBalances(erc20Instance, [receiver, owner], [-amount, amount]);
      await expect(tx1)
        .to.emit(exchangeInstance, "LendMany")
        .withArgs(
          receiver.address,
          stranger.address,
          endTimestamp,
          externalId,
          isEqualEventArgArrObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          }),
        )
        .to.emit(erc721Instance, "UpdateUser")
        .withArgs(tokenId, stranger.address, endTimestamp);

      const user = await erc721Instance.userOf(tokenId);
      expect(user).to.equal(stranger.address);
      const rentExpires = await erc721Instance.userExpires(tokenId);
      expect(rentExpires).to.equal(endTimestamp);
    });

    it("should fail: Wrong signer", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);
      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: stranger.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1,
          },
        ],
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: Wrong items count", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);
      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [],
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        extra: expires,
      });

      const tx1 = exchangeInstance.connect(receiver).lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [],
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "WrongAmount");
    });

    it("should fail: ERC721InsufficientApproval", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const erc20Instance = await deployERC1363("ERC20Simple");
      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(exchangeInstance, amount);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: owner.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        extra: expires,
      });

      const tx1 = exchangeInstance.lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1,
          },
        ],
        [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1)
        .to.be.revertedWithCustomError(erc721Instance, "ERC721InsufficientApproval")
        .withArgs(exchangeInstance, tokenId);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Rentable", exchangeInstance);

      const tx0 = erc721Instance.mintCommon(receiver.address, templateId);
      await expect(tx0).to.emit(erc721Instance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      await erc721Instance.connect(receiver).approve(exchangeInstance, tokenId);

      // lend TIME
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const endTimestamp = Math.ceil(date.getTime() / 1000); // in seconds,
      const expires = zeroPadValue(toBeHex(endTimestamp), 32);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [],
        extra: expires,
      });

      const accessControlInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);

      await accessControlInstance.renounceRole(METADATA_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).lendMany(
        {
          externalId /* lendType */,
          expiresAt,
          nonce,
          extra: expires,
          receiver: owner.address,
          referrer: stranger.address,
        },
        [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1,
          },
        ],
        [],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", exchangeInstance);
      await pausableInstance.pause();

      const tx1 = exchangeInstance.lend(
        params,
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId,
          amount,
        },
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        ZeroHash,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
