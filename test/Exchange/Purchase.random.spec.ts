import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, ZeroAddress, ZeroHash } from "ethers";

import { amount, nonce } from "@ethberry/contracts-constants";

import { VRFCoordinatorV2PlusMock } from "../../typechain-types";
import { expiresAt, externalId, extra, params, tokenId } from "../constants";
import { deployERC1363, deployUsdt, deployWeth } from "../ERC20/shared/fixtures";
import { isEqualEventArgArrObj, isEqualEventArgObj } from "../utils";
import { deployLinkVrfFixture } from "../shared/link";
import { randomRequest } from "../shared/randomRequest";
import { deployDiamond, deployErc721Base, wrapOneToManySignature } from "./shared";

describe("Diamond Exchange Purchase (Random)", function () {
  const factory = async (facetName = "ExchangeRandomFacet"): Promise<any> => {
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

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    return wrapOneToManySignature(network, contractInstance, "EXCHANGE", owner);
  };

  let vrfInstance: VRFCoordinatorV2PlusMock;
  let subId: bigint;

  before(async function () {
    await network.provider.send("hardhat_reset");

    // https://github.com/NomicFoundation/hardhat/issues/2980
    ({ vrfInstance, subId } = await loadFixture(function exchange() {
      return deployLinkVrfFixture();
    }));
  });

  describe("purchase", function () {
    it("should purchase ERC721 Random for USDT", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);

      const usdtInstance = await deployUsdt();
      await usdtInstance.transfer(receiver.address, amount);
      await usdtInstance.connect(receiver).approve(exchangeInstance, amount);

      const usdtAllowance = await usdtInstance.allowance(receiver.address, exchangeInstance);
      expect(usdtAllowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      // ADD CONSUMER TO VRFV2
      const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      const signature = await generateSignature({
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
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [
          {
            tokenType: 1,
            token: await usdtInstance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseRandom(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
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
            token: usdtInstance,
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.emit(exchangeInstance, "PurchaseRandom");
      await randomRequest(erc721Instance, vrfInstance);

      const eventFilter = vrfInstance.filters.RandomWordsFulfilled();
      const events = await vrfInstance.queryFilter(eventFilter);

      expect(events[0].args.success).to.equal(true);

      const eventRndFilter = erc721Instance.filters.MintRandom();
      const eventsRnd = await erc721Instance.queryFilter(eventRndFilter);
      // @ts-ignore
      expect(eventsRnd[0].args.to).to.equal(receiver.address);

      const metadata = await erc721Instance.getTokenMetadata(tokenId);
      expect(metadata.length).to.equal(2);

      const balance = await erc721Instance.balanceOf(receiver.address);
      expect(balance).to.equal(1);
    });

    it("should purchase ERC721 Random for WETH", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);

      const wethInstance = await deployWeth();
      await wethInstance.transfer(receiver.address, amount);
      await wethInstance.connect(receiver).approve(exchangeInstance, amount);

      const wethAllowance = await wethInstance.allowance(receiver.address, exchangeInstance);
      expect(wethAllowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      // ADD CONSUMER TO VRFV2
      const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      const signature = await generateSignature({
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
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        price: [
          {
            tokenType: 1,
            token: await wethInstance.getAddress(),
            tokenId: 0,
            amount: 1,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseRandom(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
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
            token: wethInstance,
            tokenId: 0,
            amount: 1,
          },
        ],
        signature,
        { gasLimit: 40966424 }, // block gasLimit
      );

      await expect(tx1).to.emit(exchangeInstance, "PurchaseRandom");
      await randomRequest(erc721Instance, vrfInstance);

      const eventFilter = vrfInstance.filters.RandomWordsFulfilled();
      const events = await vrfInstance.queryFilter(eventFilter);

      expect(events[0].args.success).to.equal(true);

      const eventRndFilter = erc721Instance.filters.MintRandom();
      const eventsRnd = await erc721Instance.queryFilter(eventRndFilter);
      // @ts-ignore
      expect(eventsRnd[0].args.to).to.equal(receiver.address);

      const metadata = await erc721Instance.getTokenMetadata(tokenId);
      expect(metadata.length).to.equal(2);

      const balance = await erc721Instance.balanceOf(receiver.address);
      expect(balance).to.equal(1);
    });

    it("should purchase ERC721 Random for ETH", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);

      const signature = await generateSignature({
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
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
        },
        price: [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
      });

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

      const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
      await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

      const tx1 = exchangeInstance.connect(receiver).purchaseRandom(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId,
          amount: 1n,
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
        { value: 123000000000000000n },
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRandom")
        .withArgs(
          receiver.address,
          externalId,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgArrObj({
            tokenType: 0n,
            token: ZeroAddress,
            tokenId,
            amount,
          }),
        );
    });

    it("should fail: InvalidSubscription", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);
      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      // DO NOT ADD SUBSCRIPTION CONSUMER FOR THIS TEST
      // Set VRFV2 Subscription
      // const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      // await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      // const tx02 = vrfInstance.addConsumer(subId, erc721Instance);
      // await expect(tx02)
      //   .to.emit(vrfInstance, "SubscriptionConsumerAdded")
      //   .withArgs(subId, erc721Instance);

      const signature = await generateSignature({
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
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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

      const tx1 = exchangeInstance.connect(receiver).purchaseRandom(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: owner.address,
          referrer: ZeroAddress,
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
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(vrfInstance, "InvalidSubscription");
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", exchangeInstance);

      await pausableInstance.pause();

      const tx1 = exchangeInstance.purchaseRandom(
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
