import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, encodeBytes32String, ZeroAddress, ZeroHash } from "ethers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";

import { expiresAt, externalId, extra, params } from "../constants";
import { getContractName, isEqualEventArgObj } from "../utils";
import { deployERC20 } from "../ERC20/shared/fixtures";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { wrapManyToManySignature, wrapOneToManySignature, wrapOneToOneSignature } from "./shared/utils";
import { deployDiamond } from "./shared";

describe("Diamond Exchange Lottery", function () {
  const factory = async (facetName = "ExchangeLotteryFacet"): Promise<any> => {
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

  const getSignatures = async (contractInstance: Contract, contractName = "EXCHANGE") => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const generateOneToOneSignature = wrapOneToOneSignature(network, contractInstance, contractName, owner);
    const generateOneToManySignature = wrapOneToManySignature(network, contractInstance, contractName, owner);
    const generateManyToManySignature = wrapManyToManySignature(network, contractInstance, contractName, owner);

    return {
      generateOneToOneSignature,
      generateOneToManySignature,
      generateManyToManySignature,
    };
  };

  describe("Purchase lottery", function () {
    it("should purchase lottery", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);

      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );

      // PurchaseLottery(address account, uint256 externalId, Asset[] items, Asset price, uint256 roundId, bytes32 numbers);
      // PurchaseLottery(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, bytes32 numbers);

      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver.address,
          externalId,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721TicketInstance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 121n,
            amount: amount * 1n,
          }),
          1n,
          params.extra,
        );

      const balance = await erc20Instance.balanceOf(lotteryInstance.getAddress());
      expect(balance).to.equal(amount * 1n);
    });

    it("should fail: not exist", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );
      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "NotExist");
    });

    it("should fail: wrong token", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: ZeroAddress,
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: ZeroAddress,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "WrongToken");
    });

    it("should fail: wrong signer", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 0n,
          token: await lotteryInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce1"), // wrong one
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 0n,
          token: await lotteryInstance.getAddress(),
          tokenId: 0,
          amount: 0,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: wrong signature", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();

      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      const signature = encodeBytes32String("signature");

      const tx = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: ZeroAddress,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );
      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignatureLength");
    });

    it("should fail: expired signature", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );
      // event PurchaseLottery(address account, Asset item, Asset price, uint256 round, bytes32 numbers);
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseLottery")
        .withArgs(
          receiver.address,
          externalId,
          isEqualEventArgObj({
            tokenType: 2n,
            token: await erc721TicketInstance.getAddress(),
            tokenId: 1n, // ticketId = 1
            amount: 1n,
          }),
          isEqualEventArgObj({
            tokenType: 1n,
            token: await erc20Instance.getAddress(),
            tokenId: 121n,
            amount: amount * 1n,
          }),
          1n,
          params.extra,
        );

      const tx2 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );
      await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: ERC20InsufficientAllowance", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      // await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );
      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
        .withArgs(await exchangeInstance.getAddress(), 0, amount);
    });

    it("should fail: ERC20InsufficientBalance", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );

      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
        .withArgs(receiver.address, 0, amount);
    });

    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateOneToOneSignature } = await getSignatures(exchangeInstance);

      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721LotteryTicket");

      const lotteryFactory = await ethers.getContractFactory(getContractName("LotteryRandom", network.name));

      const lotteryConfig = {
        timeLagBeforeRelease: 2592, // production: release after 2592000 seconds = 30 days
        commission: 30, // lottery wallet gets 30% commission from each round balance
      };
      const lotteryInstance: any = await lotteryFactory.deploy(lotteryConfig);
      await lotteryInstance.startRound(
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 1n,
          amount,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver.address, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance.getAddress(), amount);

      await lotteryInstance.grantRole(MINTER_ROLE, exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, lotteryInstance.getAddress());

      const signature = await generateOneToOneSignature({
        account: receiver.address,
        params: {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        item: {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
      });

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await exchangeInstance.getAddress());
      await accessInstance.renounceRole(MINTER_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: await lotteryInstance.getAddress(),
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: await erc721TicketInstance.getAddress(),
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId: 121n,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", await exchangeInstance.getAddress());

      await pausableInstance.pause();

      const tx1 = exchangeInstance.purchaseLottery(
        {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: ZeroAddress,
          referrer: ZeroAddress,
        },
        {
          tokenType: 2n,
          token: ZeroAddress,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: ZeroAddress,
          tokenId: 121n,
          amount,
        },
        ZeroHash,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
