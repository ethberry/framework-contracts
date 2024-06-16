import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract, ZeroAddress, ZeroHash } from "ethers";
import { time } from "@openzeppelin/test-helpers";

import { amount, METADATA_ROLE, MINTER_ROLE, nonce } from "@gemunion/contracts-constants";

import { deployDiamond, deployErc20Base, deployErc721Base } from "./shared";
import { expiresAt, externalId, extra, params, subscriptionId, tokenId } from "../constants";
import { TokenMetadata } from "../types";
import { VRFCoordinatorV2Mock } from "../../typechain-types";
import { isEqualEventArgArrObj, isEqualEventArgObj, recursivelyDecodeResult } from "../utils";
import { deployLinkVrfFixture } from "../shared/link";
import { wrapManyToManySignature, wrapOneToManySignature, wrapOneToOneSignature } from "./shared/utils";
import { deployBusd, deployERC1363, deployUsdt, deployWeth } from "../ERC20/shared/fixtures";
import { randomRequest } from "../shared/randomRequest";
import { decodeMetadata } from "../shared/metadata";

describe("Diamond Exchange Core", function () {
  const factory = async (facetName = "ExchangePurchaseFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet", "WalletFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

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

  let vrfInstance: VRFCoordinatorV2Mock;

  before(async function () {
    await network.provider.send("hardhat_reset");

    // https://github.com/NomicFoundation/hardhat/issues/2980
    ({ vrfInstance } = await loadFixture(function exchange() {
      return deployLinkVrfFixture();
    }));
  });

  after(async function () {
    await network.provider.send("hardhat_reset");
  });

  describe("exchange purchase", function () {
    it("should purchase ERC721 Simple for ERC20 (no ref)", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

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
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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
      await expect(tx1).to.emit(exchangeInstance, "Purchase");
      await expect(tx1).not.to.emit(exchangeInstance, "ReferralEvent");

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.TEMPLATE_ID).to.equal(tokenId);

      const balance = await erc721Instance.balanceOf(receiver.address);
      expect(balance).to.equal(1);
    });

    it("should purchase ERC721 Simple for ERC20 (ref)", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

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
          receiver: await exchangeInstance.getAddress(),
          referrer: _owner.address,
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: _owner.address,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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
        .to.emit(exchangeInstance, "Purchase")
        .to.emit(exchangeInstance, "ReferralEvent")
        .withArgs(
          receiver,
          _owner.address,
          isEqualEventArgArrObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );
      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.TEMPLATE_ID).to.equal(tokenId);

      const balance = await erc721Instance.balanceOf(receiver.address);
      expect(balance).to.equal(1);
    });

    it("should purchase ERC721 Random for ERC20", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      const tx02 = vrfInstance.addConsumer(subscriptionId, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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

      await expect(tx1).to.emit(exchangeInstance, "Purchase");

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

    it("should purchase ERC721 Genes for ERC20", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const erc20Allowance = await erc20Instance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(erc20Allowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      const tx02 = vrfInstance.addConsumer(subscriptionId, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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

      await expect(tx1).to.emit(exchangeInstance, "Purchase");

      await randomRequest(erc721Instance, vrfInstance);

      const eventFilter = vrfInstance.filters.RandomWordsFulfilled();
      const events = await vrfInstance.queryFilter(eventFilter);

      expect(events[0].args.success).to.equal(true);

      const eventRndFilter = erc721Instance.filters.MintRandom();
      const eventsRnd = await erc721Instance.queryFilter(eventRndFilter);
      // @ts-ignore
      expect(eventsRnd[0].args.to).to.equal(receiver.address);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta[TokenMetadata.TEMPLATE_ID]).to.equal(tokenId);

      expect(metadata.length).to.equal(2); // TEMPLATE_ID & GENES

      const balance = await erc721Instance.balanceOf(receiver.address);
      expect(balance).to.equal(1);
    });

    it("should purchase ERC721 Random for USDT", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

      const usdtInstance = await deployUsdt();
      await usdtInstance.transfer(receiver.address, amount);
      await usdtInstance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const usdtAllowance = await usdtInstance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(usdtAllowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      // ADD CONSUMER TO VRFV2
      const tx02 = vrfInstance.addConsumer(subscriptionId, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: await usdtInstance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.emit(exchangeInstance, "Purchase");
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

    it("should purchase ERC721 Random for BUSD", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

      const busdInstance = await deployBusd();
      await busdInstance.transfer(receiver.address, amount);
      await busdInstance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const busdAllowance = await busdInstance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(busdAllowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      // ADD CONSUMER TO VRFV2
      const tx02 = vrfInstance.addConsumer(subscriptionId, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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
            token: await busdInstance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: await busdInstance.getAddress(),
            tokenId: 0,
            amount,
          },
        ],
        signature,
      );

      await expect(tx1).to.emit(exchangeInstance, "Purchase");
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
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);

      const wethInstance = await deployWeth();
      await wethInstance.transfer(receiver.address, amount);
      await wethInstance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const wethAllowance = await wethInstance.allowance(receiver.address, await exchangeInstance.getAddress());
      expect(wethAllowance).to.equal(amount);

      // Set VRFV2 Subscription
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      // ADD CONSUMER TO VRFV2
      const tx02 = vrfInstance.addConsumer(subscriptionId, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(subscriptionId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
        },
        [
          {
            tokenType: 1,
            token: await wethInstance.getAddress(),
            tokenId: 0,
            amount: 1,
          },
        ],
        signature,
        { gasLimit: 40966424 }, // block gasLimit
      );

      await expect(tx1).to.emit(exchangeInstance, "Purchase");
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

    it("should purchase, spend ERC20", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
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

      await expect(tx1)
        .to.emit(exchangeInstance, "Purchase")
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
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          }),
        );
    });

    it("should purchase, spend ETH", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
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
        .to.emit(exchangeInstance, "Purchase")
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

    it("should purchase RANDOM, spend ETH", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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
      const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      const tx02 = vrfInstance.addConsumer(1, await erc721Instance.getAddress());
      await expect(tx02)
        .to.emit(vrfInstance, "SubscriptionConsumerAdded")
        .withArgs(1, await erc721Instance.getAddress());

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
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
        .to.emit(exchangeInstance, "Purchase")
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

    it("should fail: duplicate mint", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
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

      await expect(tx1).to.emit(exchangeInstance, "Purchase");

      const tx2 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
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
      await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await exchangeInstance.getAddress());
      await accessInstance.renounceRole(MINTER_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: ERC20InsufficientAllowance", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
        .withArgs(await exchangeInstance.getAddress(), 0, amount);
    });

    it("should fail: ECDSAInvalidSignatureLength", async function () {
      const exchangeInstance = await factory();

      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const tx = exchangeInstance.purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
        [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
        ZeroHash,
      );

      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignatureLength");
    });

    it("should fail: ExpiredSignature", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const expiresAt = (await time.latest()).toString();

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: ExpiredSignature 2", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
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

      await expect(tx1).to.emit(exchangeInstance, "Purchase");

      const tx2 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
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

      await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: InvalidSubscription", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721RandomHardhat", exchangeInstance);
      const erc20Instance = await deployERC1363("ERC20Blacklist");
      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      // DO NOT ADD SUBSCRIPTION CONSUMER FOR THIS TEST
      // Set VRFV2 Subscription
      // const tx01 = erc721Instance.setSubscriptionId(subscriptionId);
      // await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(1);

      // const tx02 = vrfInstance.addConsumer(subId, await erc721Instance.getAddress());
      // await expect(tx02)
      //   .to.emit(vrfInstance, "SubscriptionConsumerAdded")
      //   .withArgs(subId, await erc721Instance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1,
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

      await expect(tx1).to.be.revertedWithCustomError(vrfInstance, "InvalidSubscription");
    });

    it("should purchase", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      await erc721Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(METADATA_ROLE, await exchangeInstance.getAddress());

      const signature = await generateOneToManySignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
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

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: await exchangeInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
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
        { value: amount, gasLimit: 500000 },
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "Purchase")
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

      await expect(tx1).to.changeEtherBalances([receiver, exchangeInstance], [-amount, amount]);
    });
  });

  describe("ERROR", function () {
    it("should fail: receiver not exist", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToManySignature } = await getSignatures(exchangeInstance);
      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);

      await erc721Instance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(METADATA_ROLE, await exchangeInstance.getAddress());

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
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
        price: [
          {
            amount,
            token: "0x0000000000000000000000000000000000000000",
            tokenId: "0",
            tokenType: 0,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchase(
        {
          externalId,
          expiresAt,
          nonce,
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
        },
        [
          {
            amount,
            token: "0x0000000000000000000000000000000000000000",
            tokenId: "0",
            tokenType: 0,
          },
        ],
        signature,
        { value: amount, gasLimit: 500000 },
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "NotExist");
    });

    it("should fail: EnforcedPause", async function () {
      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", await exchangeInstance.getAddress());

      await pausableInstance.pause();

      const tx1 = exchangeInstance.purchase(
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
