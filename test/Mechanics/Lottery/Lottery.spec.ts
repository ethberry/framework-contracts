import { expect } from "chai";
import { ethers, network, web3 } from "hardhat";
import {
  Contract,
  encodeBytes32String,
  getUint,
  parseEther,
  toBeHex,
  toQuantity,
  WeiPerEther,
  ZeroAddress,
} from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";
import { shouldBehaveLikePausable } from "@ethberry/contracts-utils";
import { amount, DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce, PAUSER_ROLE } from "@ethberry/contracts-constants";
import { recursivelyDecodeResult } from "@ethberry/utils-eth";
import { delay } from "@ethberry/utils";

import { expiresAt, externalId, extra, params, tokenId } from "../../constants";
import { deployLinkVrfFixture } from "../../shared/link";
import { VRFCoordinatorV2PlusMock } from "../../../contracts/core";
import { randomRequest } from "../../shared/randomRequest";
import { deployLottery } from "./fixture";
import { deployDiamond, wrapOneToOneSignature } from "../../Exchange/shared";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj } from "../../utils";
import { decodeMetadata } from "../../shared/metadata";

describe("Lottery", function () {
  let vrfInstance: VRFCoordinatorV2PlusMock;
  let subId: bigint;

  const lotteryConfig = {
    timeLagBeforeRelease: 100, // production: release after 2592000 seconds = 30 days
    commission: 30, // lottery wallet gets 30% commission from each round balance
  };

  const factory = async (facetName = "ExchangeLotteryFacet"): Promise<any> => {
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

  const factoryLottery = () => deployLottery(lotteryConfig);

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    return wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
  };

  before(async function () {
    if (network.name === "hardhat") {
      await network.provider.send("hardhat_reset");

      // https://github.com/NomicFoundation/hardhat/issues/2980
      ({ vrfInstance, subId } = await loadFixture(function chainlink() {
        return deployLinkVrfFixture();
      }));
    }
  });

  shouldBehaveLikeAccessControl(async () => {
    const { lotteryInstance } = await factoryLottery();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return lotteryInstance;
  })(DEFAULT_ADMIN_ROLE, PAUSER_ROLE);

  shouldBehaveLikePausable(async () => {
    const { lotteryInstance } = await factoryLottery();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return lotteryInstance;
  });

  describe("Start Round", function () {
    it("should start new round", async function () {
      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();
      const tx = await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const current: number = (await time.latest()).toNumber();
      // emit RoundStarted(roundNumber, block.timestamp, maxTicket, ticket, price);
      await expect(tx)
        .to.emit(lotteryInstance, "RoundStarted")
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
      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const tx = lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });
  });

  describe("Finish Round", function () {
    it("should end current round", async function () {
      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
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
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(lotteryInstance, vrfInstance);
      }
    });

    it("should get current round info", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const tx0 = await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const timeStart: number = (await time.latest()).toNumber();

      await expect(tx0)
        .to.emit(lotteryInstance, "RoundStarted")
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
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      const values = [1, 2, 3, 4, 5, 6];
      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 101 /* db id */, defNumbers);

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        await randomRequest(lotteryInstance, vrfInstance);
      }
      // emit RoundFinalized(currentRound.roundId, currentRound.values);
      const eventFilter = lotteryInstance.filters.RoundFinalized();
      const events = await lotteryInstance.queryFilter(eventFilter);
      const { winValues } = recursivelyDecodeResult(events[0].args);
      const roundInfo = await lotteryInstance.getCurrentRoundInfo();

      expect(recursivelyDecodeResult(roundInfo)).deep.include({
        roundId: 1n,
        startTimestamp: getUint(timeStart),
        endTimestamp: getUint(current),
        maxTicket: 0n,
        values: winValues,
        aggregation: [0n, 0n, 0n, 0n, 0n, 0n, 0n],
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

    it("should fail: LotteryRoundNotActive", async function () {
      const { lotteryInstance } = await factoryLottery();
      const tx = lotteryInstance.endRound();
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotActive");
    });
  });

  describe("Purchase Lottery", function () {
    it("should purchase Lottery and mint ticket", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const values = [1, 2, 3, 4, 5, 6];
      const ticketNumbers = getNumbersBytes(values);
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra: ticketNumbers,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = await exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra: ticketNumbers,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );

      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          ticketNumbers,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver, tokenId);
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.ROUND).to.equal(1n);
      expect(toBeHex(decodedMeta.NUMBERS, 32)).to.equal(ticketNumbers);
      expect(getBytesNumbersArr(decodedMeta.NUMBERS)).to.have.all.members(values);
    });

    it("should finish round with 1 ticket and release funds", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const dbRoundId = 101;
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          dbRoundId, // externalId: db roundId
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
          params.extra,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance);
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // const roundInfo = await lotteryInstance.getCurrentRoundInfo();

      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(lotteryConfig.timeLagBeforeRelease + 1)));

      const tx1 = lotteryInstance.releaseFunds(1);
      await expect(tx1)
        .to.emit(lotteryInstance, "Released")
        // .withArgs(1, amount - (amount / 100n) * BigInt(lotteryConfig.commission));
        .withArgs(1, amount);
      await expect(tx1).changeTokenBalances(
        erc20Instance,
        [owner, lotteryInstance],
        [
          // amount - (amount / 100n) * BigInt(lotteryConfig.commission),
          // -(amount - (amount / 100n) * BigInt(lotteryConfig.commission)),
          amount,
          -amount,
        ],
      );
    });

    it("should finish ETH round with 1 ticket and release funds", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId: 0,
          amount: WeiPerEther,
        },
        0, // maxTicket count
      );

      const dbRoundId = 101;
      const values = [8, 5, 3, 2, 1, 0];
      const defNumbers = getNumbersBytes(values);
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra: defNumbers,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 0,
          token: ZeroAddress,
          tokenId: 0,
          amount: WeiPerEther,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra: defNumbers,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId: 0,
          amount: WeiPerEther,
        },
        signature,
        { value: WeiPerEther },
      );

      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          dbRoundId, // externalId: db roundId
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721Instance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 0n,
            token: ZeroAddress,
            tokenId: 0n,
            amount: WeiPerEther,
          }),
          1n,
          defNumbers,
        );
      await expect(tx0).changeEtherBalances([lotteryInstance, receiver], [WeiPerEther, -WeiPerEther]);

      // if (network.name !== "hardhat") {
      //   await delay(10000).then(() => console.info("delay 10000 done"));
      // }
      //
      // const tx = await lotteryInstance.endRound();
      // const current: number = (await time.latest()).toNumber();
      // await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);
      //
      // if (network.name !== "hardhat") {
      //   await delay(10000).then(() => console.info("delay 10000 done"));
      // }
      //
      // if (network.name === "hardhat") {
      //   // RANDOM
      //   await randomRequest(lotteryInstance, vrfInstance);
      // } else {
      //   const eventFilter = lotteryInstance.filters.RoundFinalized();
      //   const events = await lotteryInstance.queryFilter(eventFilter);
      //   expect(events.length).to.be.greaterThan(0);
      //   expect(events[0].args?.round).to.equal(1);
      // }
      //
      // // const roundInfo = await lotteryInstance.getCurrentRoundInfo();
      // // console.log("recursivelyDecodeResult(roundInfo)", recursivelyDecodeResult(roundInfo));
      //
      // // WAIT for RELEASE
      // const latest = await time.latestBlock();
      // await time.advanceBlockTo(latest.add(web3.utils.toBN(lotteryConfig.timeLagBeforeRelease + 1)));
      //
      // const tx1 = lotteryInstance.releaseFunds(1);
      // // const total = WeiPerEther - (WeiPerEther / 100n) * BigInt(lotteryConfig.commission);
      // const total = WeiPerEther;
      // await expect(tx1).to.emit(lotteryInstance, "Released").withArgs(1, total);
      // await expect(tx1).changeEtherBalances([lotteryInstance, owner], [-total, total]);
    });

    it("should get prize from previous round", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount * 2n);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount * 2n);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      // ROUND 1
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // DUMMY ROUND
      // winValues [ 23n, 8n, 18n, 12n, 10n, 13n ] with randomness = hexlify(nonce)
      const ticketValues = [23, 8, 18, 12, 10, 13];
      const ticketNumbers = getNumbersBytes(ticketValues);

      const dbRoundId = 101;
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra: ticketNumbers,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra: ticketNumbers,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          dbRoundId, // externalId: db roundId
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
          ticketNumbers,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance, BigInt(nonce));
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // ROUND 2
      const tx1 = await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const current1: number = (await time.latest()).toNumber();
      await expect(tx1)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          2n, // round 2
          toQuantity(current1),
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

      const tx2 = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx2).to.emit(lotteryInstance, "Prize");
      // TODO .withArgs(receiver, 1, 1, prizeAmount);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.PRIZE).to.equal(1n);
      expect(decodedMeta.ROUND).to.equal(BigInt(dbRoundId));
      expect(toBeHex(decodedMeta.NUMBERS, 32)).to.equal(ticketNumbers);
    });

    it("should fail get prize from previous round: no Prize", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount * 2n);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount * 2n);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      // ROUND 1
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const dbRoundId = 101;
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2,
          token: await erc721Instance.getAddress(),
          tokenId: 0,
          amount: 1n,
        },
        price: {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          dbRoundId, // externalId: db roundId
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
          params.extra,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance);
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // ROUND 2
      const tx1 = await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const current1: number = (await time.latest()).toNumber();
      await expect(tx1)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          2n, // round 2
          toQuantity(current1),
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

      const tx2 = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx2).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
    });

    // fail get prize from previous round
    it("should fail: LotteryTicketExpired", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount * 2n);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount * 2n);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }

      // ROUND 1
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const dbRoundId = 101;
      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId: dbRoundId, // externalId: db roundId
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          dbRoundId, // externalId: db roundId
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
          params.extra,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance);
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // ROUND 2
      const tx1 = await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      const current1: number = (await time.latest()).toNumber();
      await expect(tx1)
        .to.emit(lotteryInstance, "RoundStarted")
        .withArgs(
          2n, // round 2
          toQuantity(current1),
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

      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(lotteryConfig.timeLagBeforeRelease + 1)));

      const tx2 = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx2).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketExpired");
    });

    it("should release without delay: if no tickets win", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId, // wtf?
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          params.extra,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance);
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      // NO WAIT for RELEASE
      const tx1 = lotteryInstance.releaseFunds(1);
      const total = amount;
      await expect(tx1).to.emit(lotteryInstance, "Released").withArgs(1, total);
      await expect(tx1).changeTokenBalances(erc20Instance, [lotteryInstance, owner], [-total, total]);
    });

    it("should fail: is not releasable yet", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // DUMMY ROUND
      // winValues [ 23n, 8n, 18n, 12n, 10n, 13n ] with randomness = hexlify(nonce)
      const ticketValues = [23, 8, 18, 12, 10, 13];
      const ticketNumbers = getNumbersBytes(ticketValues);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra: ticketNumbers,
          receiver: await lotteryInstance.getAddress(),
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

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId, // wtf?
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra: ticketNumbers,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          ticketNumbers,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      const tx = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      if (network.name !== "hardhat") {
        await delay(10000).then(() => console.info("delay 10000 done"));
      }

      if (network.name === "hardhat") {
        // RANDOM
        await randomRequest(lotteryInstance, vrfInstance, BigInt(nonce));
      } else {
        const eventFilter = lotteryInstance.filters.RoundFinalized();
        const events = await lotteryInstance.queryFilter(eventFilter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.round).to.equal(1);
      }

      const eventFilter = lotteryInstance.filters.RoundFinalized();
      const events = await lotteryInstance.queryFilter(eventFilter);
      const { winValues } = recursivelyDecodeResult(events[0].args);
      expect(winValues.join(",")).to.equal(ticketValues.join(","));

      // NO WAIT for RELEASE
      const tx1 = lotteryInstance.releaseFunds(1);
      await expect(tx1).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: zero balance", async function () {
      const { lotteryInstance } = await factoryLottery();

      // WAIT for RELEASE
      const latest = await time.latestBlock();
      await time.advanceBlockTo(latest.add(web3.utils.toBN(lotteryConfig.timeLagBeforeRelease + 1)));

      const tx1 = lotteryInstance.releaseFunds(0);
      await expect(tx1).to.be.revertedWithCustomError(lotteryInstance, "LotteryZeroBalance");
    });

    it("should fail: no more tickets available", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount * 3n);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount * 3n);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        2, // maxTicket count
      );

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId: 0n,
          amount: 1n,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 0n,
          amount: amount * 1n,
        },
      });

      const tx0 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"),
          extra,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx0)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          params.extra,
        );
      await expect(tx0).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      const signature1 = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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
      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce2"),
          externalId,
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature1,
      );
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          params.extra,
        );
      await expect(tx1).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      const signature2 = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce3"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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
      const tx2 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          nonce: encodeBytes32String("nonce3"),
          externalId,
          expiresAt,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature2,
      );
      await expect(tx2).to.be.revertedWithCustomError(lotteryInstance, "LotteryTicketLimitExceed");
    });

    it("should fail: current round is finished", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Set VRFV2 Subscription
        const tx01 = lotteryInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(lotteryInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      const tx0 = await lotteryInstance.endRound();
      const current: number = (await time.latest()).toNumber();
      await expect(tx0).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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

      const tx = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });
  });

  describe("Get prize", function () {
    it("should get prize: Jackpot 1 ticket", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 1];
      const ticketNumbers = getNumbersBytes(values);
      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 101 /* db id */, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      const prizeAmount = WeiPerEther * 7000n - 180n; // rounding error

      const tx = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize").withArgs(receiver, 1, 1, prizeAmount);

      // TEST METADATA
      const metadata = recursivelyDecodeResult(await erc721Instance.getTokenMetadata(tokenId));
      const decodedMeta = decodeMetadata(metadata as any[]);
      expect(decodedMeta.PRIZE).to.equal(1n);
      expect(decodedMeta.ROUND).to.equal(101n);
      expect(toBeHex(decodedMeta.NUMBERS, 32)).to.equal(ticketNumbers);
      expect(getBytesNumbersArr(decodedMeta.NUMBERS)).to.have.all.members(values);
    });

    it("should get prize: Jackpot 2 tickets", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 2];

      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();
      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 101 /* db id */, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 1,
          amount,
        },
        0, // maxTicket count
      );

      const prizeAmount = WeiPerEther * 3500n - 200n; // rounding error

      const tx = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize").withArgs(receiver, 1, 1, prizeAmount);
    });

    it("should fail: round not finished", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const { lotteryInstance, erc20Instance, erc721Instance } = await factoryLottery();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);

      if (network.name === "hardhat") {
        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, lotteryInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, lotteryInstance);
      }
      await lotteryInstance.startRound(
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 1,
          amount: 1n,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      // const tx0 = await lotteryInstance.endRound();
      // const current: number = (await time.latest()).toNumber();
      // await expect(tx0).to.emit(lotteryInstance, "RoundEnded").withArgs(1, current);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: await lotteryInstance.getAddress(),
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

      const tx = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId, // wtf?
          expiresAt,
          nonce: encodeBytes32String("nonce2"),
          extra,
          receiver: lotteryInstance,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        signature,
      );
      await expect(tx)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver,
          externalId,
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
          params.extra,
        )
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, receiver, tokenId);
      await expect(tx).changeTokenBalances(erc20Instance, [receiver, lotteryInstance], [-amount, amount]);

      const tx1 = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx1).to.be.revertedWithCustomError(lotteryInstance, "LotteryRoundNotComplete");
    });

    it("should fail: already got prize", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 1];

      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 1, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);
      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      const prizeAmount = WeiPerEther * 7000n - 180n; // rounding error

      const tx = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx).to.emit(lotteryInstance, "Prize").withArgs(receiver, 1, 1, prizeAmount);

      const tx1 = lotteryInstance.connect(receiver).getPrize(tokenId, 1);
      await expect(tx1).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongToken");
    });

    it("should fail: LotteryNotOwnerNorApproved", async function () {
      const [_owner, receiver, stranger] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 1];

      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 1, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);
      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      const tx = lotteryInstance.connect(stranger).getPrize(tokenId, 1);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryNotOwnerNorApproved");
    });

    it("should fail: wrong round", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 1];

      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 101 /* db id */, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);
      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      const tx = lotteryInstance.connect(receiver).getPrize(1, 2);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });

    it("should fail: wrong token round", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const values = [8, 5, 3, 2, 1, 0];
      const aggregation = [0, 0, 0, 0, 0, 0, 1];

      const { lotteryInstance, erc721Instance, erc20Instance } = await factoryLottery();

      const defNumbers = getNumbersBytes(values);
      await erc721Instance.mintTicket(receiver, 1, 101 /* db id */, defNumbers);
      await erc721Instance.mintTicket(receiver, 2, 101 /* db id */, defNumbers);
      await erc721Instance.grantRole(MINTER_ROLE, lotteryInstance);
      await erc20Instance.mint(lotteryInstance, parseEther("20000"));

      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );
      await lotteryInstance.setDummyRound(
        defNumbers,
        values,
        aggregation,
        nonce,
        {
          tokenType: 2,
          token: erc721Instance,
          tokenId: 0,
          amount,
        },
        {
          tokenType: 1,
          token: erc20Instance,
          tokenId: 0,
          amount,
        },
        0, // maxTicket count
      );

      await erc721Instance.connect(receiver).approve(lotteryInstance, 1);

      const tx = lotteryInstance.connect(receiver).getPrize(1, 2);
      await expect(tx).to.be.revertedWithCustomError(lotteryInstance, "LotteryWrongRound");
    });
  });
});
