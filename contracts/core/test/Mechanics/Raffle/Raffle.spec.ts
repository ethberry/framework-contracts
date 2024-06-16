import { expect } from "chai";
import { ethers, network, web3 } from "hardhat";
import { encodeBytes32String, getUint, parseEther, toQuantity, ZeroAddress } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { shouldBehaveLikePausable } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { amount, DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce, PAUSER_ROLE } from "@gemunion/contracts-constants";

import { expiresAt, extra, subscriptionId, tokenId } from "../../constants";
import { deployLinkVrfFixture } from "../../shared/link";
import { IERC721Random, VRFCoordinatorV2Mock } from "../../../typechain-types";
import { randomFixRequest, randomRequest } from "../../shared/randomRequest";
import { deployRaffle } from "./fixture";
import { wrapOneToOneSignature } from "../../Exchange/shared/utils";
import { isEqualEventArgObj, recursivelyDecodeResult } from "../../utils";
import { decodeMetadata } from "../../shared/metadata";
import { deployDiamond } from "../../Exchange/shared";

const delay = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

describe("Raffle", function () {
  let vrfInstance: VRFCoordinatorV2Mock;
  const dbRoundId = 101;
  const winnerTokenId = 3;

  const raffleConfig = {
    timeLagBeforeRelease: 100, // production: release after 2592000 seconds = 30 days
    commission: 30, // raffle???
  };

  const factoryDiamond = async () =>
    deployDiamond(
      "DiamondExchange",
      ["ExchangeRaffleFacet", "PausableFacet", "AccessControlFacet", "WalletFacet"],
      "DiamondExchangeInit",
      {
        // log: true,
        logSelectors: false,
      },
    );

  const factory = () => deployRaffle(raffleConfig);

  before(async function () {
    if (network.name === "hardhat") {
      await network.provider.send("hardhat_reset");

      // https://github.com/NomicFoundation/hardhat/issues/2980
      ({ vrfInstance } = await loadFixture(function chainlink() {
        return deployLinkVrfFixture();
      }));
    }
  });

  shouldBehaveLikeAccessControl(async () => {
    const { raffleInstance } = await factory();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return raffleInstance;
  })(DEFAULT_ADMIN_ROLE, PAUSER_ROLE);

  shouldBehaveLikePausable(async () => {
    const { raffleInstance } = await factory();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return raffleInstance;
  });

  describe("Start Round", function () {
    it("should start new round", async function () {
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();
      const tx = await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const current: number = (await time.latest()).toNumber();
      await expect(tx)
        .to.emit(raffleInstance, "RoundStarted")
        .withArgs(
          1n,
          toQuantity(current),
          0n,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );
    });

    it("should fail: not yet finished", async function () {
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();
      raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const tx = raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "NotComplete");
    });
  });

  describe("Finish Round", function () {
    it("should end current round", async function () {
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(raffleInstance as IERC721Random, vrfInstance);
      }
    });

    it("should get current round info with 0 tickets", async function () {
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const tx0 = await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const timeStart: number = (await time.latest()).toNumber();

      await expect(tx0)
        .to.emit(raffleInstance, "RoundStarted")
        .withArgs(
          1n,
          toQuantity(timeStart),
          0n,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(raffleInstance, vrfInstance);
      }

      // emit RoundFinalized(currentRound.roundId, prizeNumber);
      const eventFilter = raffleInstance.filters.RoundFinalized();
      const events = await raffleInstance.queryFilter(eventFilter);
      const { prizeNumber } = recursivelyDecodeResult(events[0].args);
      expect(Number(prizeNumber)).to.equal(0); // Zero if 0 tickets sold
      const roundInfo = await raffleInstance.getCurrentRoundInfo();

      expect(recursivelyDecodeResult(roundInfo)).deep.include({
        roundId: 1n,
        startTimestamp: getUint(timeStart),
        endTimestamp: getUint(current),
        maxTicket: 0n,
        prizeNumber,
        acceptedAsset: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 0n,
          amount,
        },
        ticketAsset: {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId: 1n,
          amount: 1n,
        },
      });
    });

    it("should get current round info with 1 ticket", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      const tx0 = await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const timeStart: number = (await time.latest()).toNumber();

      await expect(tx0)
        .to.emit(raffleInstance, "RoundStarted")
        .withArgs(
          1n,
          toQuantity(timeStart),
          0n,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, tokenId);
      await expect(tx1).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(raffleInstance, vrfInstance);
      }

      // emit RoundFinalized(currentRound.roundId, prizeNumber);
      const eventFilter = raffleInstance.filters.RoundFinalized();
      const events = await raffleInstance.queryFilter(eventFilter);
      const { prizeNumber } = recursivelyDecodeResult(events[0].args);
      expect(Number(prizeNumber)).to.equal(1); // Zero if 0 tickets sold
      const roundInfo = await raffleInstance.getCurrentRoundInfo();

      expect(recursivelyDecodeResult(roundInfo)).deep.include({
        roundId: 1n,
        startTimestamp: getUint(timeStart),
        endTimestamp: getUint(current),
        maxTicket: 0n,
        prizeNumber,
        acceptedAsset: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 0n,
          amount,
        },
        ticketAsset: {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId: 1n,
          amount: 1n,
        },
      });
    });

    it("should get current round info with 2 tickets", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.mint(stranger.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);
      await erc20Instance.connect(stranger).approve(exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      const tx0 = await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const timeStart: number = (await time.latest()).toNumber();

      await expect(tx0)
        .to.emit(raffleInstance, "RoundStarted")
        .withArgs(
          1n,
          toQuantity(timeStart),
          0n,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount,
          }),
        );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      // GENERATE 1 SIGNATURE
      const signature1 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      // BUY 1 TICKET
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature1,
      );
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, tokenId);
      await expect(tx1).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      // GENERATE 2 SIGNATURE
      const signature2 = await generateOneToOneSignature({
        account: stranger.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      // BUY 2 TICKET
      const tx2 = exchangeInstance.connect(stranger).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature2,
      );
      await expect(tx2)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          stranger.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: tokenId + 1n, // ticketId = 2
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n, // roundId
          2n, // index - round.tickets[index]
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, stranger.address, tokenId + 1n);
      await expect(tx2).changeTokenBalances(erc20Instance, [stranger, raffleInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(raffleInstance, vrfInstance);
      }

      // emit RoundFinalized(currentRound.roundId, prizeNumber);
      const eventFilter = raffleInstance.filters.RoundFinalized();
      const events = await raffleInstance.queryFilter(eventFilter);
      const { prizeNumber } = recursivelyDecodeResult(events[0].args);
      // We can't predict this output anymore because it depends on randomness
      // expect(Number(prizeNumber)).to.equal(1); // Zero if 0 tickets sold
      const roundInfo = await raffleInstance.getCurrentRoundInfo();

      expect(recursivelyDecodeResult(roundInfo)).deep.include({
        roundId: 1n,
        startTimestamp: getUint(timeStart),
        endTimestamp: getUint(current),
        maxTicket: 0n,
        prizeNumber,
        acceptedAsset: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 0n,
          amount,
        },
        ticketAsset: {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId: 1n,
          amount: 1n,
        },
      });
    });

    it("should fail: previous round is already finished", async function () {
      const { raffleInstance } = await factory();
      const tx = raffleInstance.endRound();
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "NotActive");
    });
  });

  describe("Purchase Raffle", function () {
    it("should purchase Lottery and mint ticket", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, tokenId);
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.ROUND).to.equal(BigInt(dbRoundId));
    });

    it("should finish round with 1 ticket and release funds", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const dbRoundId = 123;
      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(raffleInstance as IERC721Random, vrfInstance);
      } else {
        const eventFilter = raffleInstance.filters.RoundFinalized();
        const events = await raffleInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(raffleConfig.timeLagBeforeRelease + 1)));

      const tx1 = raffleInstance.releaseFunds(1);
      await expect(tx1).to.emit(raffleInstance, "Released").withArgs(1, amount);
      await expect(tx1).changeTokenBalances(erc20Instance, [owner, raffleInstance], [amount, -amount]);
    });

    it("should finish round with 2 tickets and release funds", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount * 2n);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount * 2n);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const signature1 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });
      const tx01 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature1,
      );
      await expect(tx01)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 2n, // ticketId = 2
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          2n,
        );
      await expect(tx01).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }
      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(raffleInstance as IERC721Random, vrfInstance);
      } else {
        const eventFilter = raffleInstance.filters.RoundFinalized();
        const events = await raffleInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      const eventFilter = raffleInstance.filters.RoundFinalized();
      const events = await raffleInstance.queryFilter(eventFilter);
      const { prizeNumber } = recursivelyDecodeResult(events[0].args);
      // Expected prize number is 1 or 2
      expect(Number(prizeNumber)).to.be.greaterThan(0).to.be.lessThan(3);
      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(raffleConfig.timeLagBeforeRelease + 1)));

      const tx1 = raffleInstance.releaseFunds(1);
      await expect(tx1)
        .to.emit(raffleInstance, "Released")
        .withArgs(1, amount * 2n);
      await expect(tx1).changeTokenBalances(erc20Instance, [owner, raffleInstance], [2n * amount, -amount * 2n]);
    });

    it("should finish round with 3 tickets", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount * 3n);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount * 3n);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      // ROUND 1
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const signature1 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });
      const tx01 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature1,
      );
      await expect(tx01)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 2n, // ticketId = 2
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          2n,
        );
      await expect(tx01).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const signature2 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });
      const tx02 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature2,
      );
      await expect(tx02)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 3n, // ticketId = 3
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          3n,
        );
      await expect(tx02).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }
      if (network.name === "hardhat") {
        // RANDOM
        await randomFixRequest(raffleInstance as IERC721Random, vrfInstance);
      } else {
        const eventFilter = raffleInstance.filters.RoundFinalized();
        const events = await raffleInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      const eventFilter = raffleInstance.filters.RoundFinalized();
      const events = await raffleInstance.queryFilter(eventFilter);
      const { prizeNumber } = recursivelyDecodeResult(events[0].args);
      // Expected prize number is 1 or 2
      expect(Number(prizeNumber))
        .to.be.greaterThan(0)
        .to.be.lessThan(3 /* ticket count */ + 1)
        .to.equal(3);

      const tx1 = raffleInstance.connect(receiver).getPrize(winnerTokenId, 1);
      await expect(tx1)
        .to.emit(raffleInstance, "Prize")
        .withArgs(receiver.address, 1, winnerTokenId, 3 /* multiplier = round ticket count */);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(winnerTokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.ROUND).to.equal(BigInt(dbRoundId));
      expect(decodedMeta.PRIZE).to.equal(3n /* multiplier = round tickets count */);
    });

    it("should fail: zero balance", async function () {
      const { raffleInstance } = await factory();

      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(raffleConfig.timeLagBeforeRelease + 1)));

      const tx1 = raffleInstance.releaseFunds(0);
      await expect(tx1).to.be.revertedWithCustomError(raffleInstance, "ZeroBalance");
    });

    it("should fail: no more tickets available", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount * 3n);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount * 3n);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        2, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const signature1 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature1,
      );
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 2n, // ticketId = 2
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          2n,
        );
      await expect(tx1).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const signature2 = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });
      const tx2 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature2,
      );
      await expect(tx2).to.be.revertedWithCustomError(raffleInstance, "LimitExceed");
    });

    it("should fail: current round is finished", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx0 = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx0).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "WrongRound");
    });
  });

  describe("Get prize", function () {
    it("should get prize", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      await erc20Instance.mint(await raffleInstance.getAddress(), parseEther("20000"));
      // function setDummyRound(uint256 prizeNumber, uint256 requestId, Asset memory item, Asset memory price)
      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx = raffleInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx).to.emit(raffleInstance, "Prize").withArgs(receiver.address, 1, 1, 1);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.ROUND).to.equal(BigInt(dbRoundId));
      expect(decodedMeta.PRIZE).to.equal(1n);
    });

    it("should get prize from previous round", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, await raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }

      // ROUND 1
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const dbRoundId = 101;
      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await raffleInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(raffleInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(raffleInstance as IERC721Random, vrfInstance);
      } else {
        const eventFilter = raffleInstance.filters.RoundFinalized();
        const events = await raffleInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // ROUND 2
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx2 = raffleInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx2).to.emit(raffleInstance, "Prize").withArgs(receiver.address, 1, 1, 1);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.ROUND).to.equal(BigInt(dbRoundId));
      expect(decodedMeta.PRIZE).to.equal(1n);
    });

    it("should fail: round not finished", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc20Instance, erc721Instance } = await factory();

      const diamondInstance = await factoryDiamond();
      const diamondAddress = await diamondInstance.getAddress();

      const exchangeInstance = await ethers.getContractAt("ExchangeRaffleFacet", diamondAddress);

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = raffleInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(raffleInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(1, raffleInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(1, await raffleInstance.getAddress());
      }
      await raffleInstance.startRound(
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // BUY TICKET @EXCHANGE
      const networkE = await ethers.provider.getNetwork();
      const generateOneToOneSignature = wrapOneToOneSignature(networkE, exchangeInstance, "EXCHANGE", owner);

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          externalId: dbRoundId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver.address,
          BigInt(dbRoundId),
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 0n,
            amount: amount * 1n,
          }),
          1n,
          1n,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, tokenId);
      await expect(tx).changeTokenBalances(erc20Instance, [receiver, raffleInstance], [-amount, amount]);

      const tx1 = raffleInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx1).to.be.revertedWithCustomError(raffleInstance, "NotComplete");
    });

    it("should fail: wrong round", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      await erc20Instance.mint(await raffleInstance.getAddress(), parseEther("20000"));
      // function setDummyRound(uint256 prizeNumber, uint256 requestId, Asset memory item, Asset memory price)
      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx = raffleInstance.connect(receiver).getPrize(tokenId, 2);
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "WrongRound");
    });

    it("should fail: already got prize", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());
      await erc20Instance.mint(raffleInstance.getAddress(), parseEther("20000"));

      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx = raffleInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx).to.emit(raffleInstance, "Prize").withArgs(receiver.address, 1, 1, 1);

      const tx1 = raffleInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx1).to.be.revertedWithCustomError(raffleInstance, "WrongToken");
    });

    it("should fail: not a winner", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());
      await erc20Instance.mint(raffleInstance.getAddress(), parseEther("20000"));

      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx = raffleInstance.connect(receiver).getPrize(2, 1);
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "NotInList");
    });

    it("should fail: not an owner", async function () {
      const [_owner, receiver, stranger] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());
      await erc20Instance.mint(raffleInstance.getAddress(), parseEther("20000"));

      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx = raffleInstance.connect(stranger).getPrize(tokenId, 1);
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "NotAnOwner");
    });

    it("should fail: wrong token round", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { raffleInstance, erc721Instance, erc20Instance } = await factory();

      await erc721Instance.mintTicket(receiver.address, 1, 101, 1);
      await erc721Instance.mintTicket(receiver.address, 2, 101, 2);
      await erc721Instance.grantRole(MINTER_ROLE, raffleInstance.getAddress());

      await erc20Instance.mint(await raffleInstance.getAddress(), parseEther("20000"));
      // function setDummyRound(uint256 prizeNumber, uint256 requestId, Asset memory item, Asset memory price)
      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      await raffleInstance.setDummyRound(
        1, // winner ticketId
        nonce,
        {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(await raffleInstance.getAddress(), 1);

      const tx = raffleInstance.connect(receiver).getPrize(tokenId, 2);
      await expect(tx).to.be.revertedWithCustomError(raffleInstance, "WrongRound");
    });
  });
});
