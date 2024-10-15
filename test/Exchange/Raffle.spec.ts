import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, encodeBytes32String, ZeroAddress, ZeroHash } from "ethers";

import { amount, MINTER_ROLE } from "@ethberry/contracts-constants";

import { expiresAt, externalId, extra } from "../constants";
import { getContractName, isEqualEventArgObj } from "../utils";
import { deployERC20 } from "../ERC20/shared/fixtures";
import { deployERC721 } from "../ERC721/shared/fixtures";
import { deployDiamond, wrapOneToOneSignature } from "./shared";

describe("Diamond Exchange Raffle", function () {
  const factory = async (facetName = "ExchangeRaffleFacet"): Promise<any> => {
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

  const getSignatures = async (contractInstance: Contract, contractName = "EXCHANGE") => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    return wrapOneToOneSignature(network, contractInstance, contractName, owner);
  };

  describe("Purchase", function () {
    it("should purchase Raffle ticket", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));
      const raffleInstance: any = await raffleFactory.deploy();

      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(exchangeInstance, amount);

      await raffleInstance.grantRole(MINTER_ROLE, exchangeInstance);
      await erc721TicketInstance.grantRole(MINTER_ROLE, raffleInstance);

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );

      // event PurchaseRaffle(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, uint256 index);
      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver,
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
        );

      const balance = await erc20Instance.balanceOf(raffleInstance);
      expect(balance).to.equal(amount * 1n);
    });

    it("should fail: ETHInvalidReceiver", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const signature = await generateSignature({
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
          token: ZeroAddress,
          tokenId: 0,
          amount: 1,
        },
        price: {
          tokenType: 0n,
          token: ZeroAddress,
          tokenId: 121n,
          amount,
        },
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
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
          tokenType: 0n,
          token: ZeroAddress,
          tokenId: 121n,
          amount,
        },
        signature,
        {
          value: amount,
        },
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "ETHInvalidReceiver");
    });

    it("should fail: ERC20InvalidReceiver", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc20Instance = await deployERC20();
      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      const signature = await generateSignature({
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

      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
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
          token: erc20Instance,
          tokenId: 121n,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(erc20Instance, "ERC20InvalidReceiver");
    });

    it("should fail: wrong signer", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const raffleInstance: any = await raffleFactory.deploy();
      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId: 101,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
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
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const raffleInstance: any = await raffleFactory.deploy();
      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      const signature = encodeBytes32String("signature");

      const tx = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );
      await expect(tx).to.be.revertedWithCustomError(exchangeInstance, "ECDSAInvalidSignatureLength");
    });

    it("should fail: expired signature", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const raffleInstance: any = await raffleFactory.deploy();
      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );

      await expect(tx1)
        .to.emit(exchangeInstance, "PurchaseRaffle")
        .withArgs(
          receiver,
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
        );

      const tx2 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );
      await expect(tx2).to.be.revertedWithCustomError(exchangeInstance, "ExpiredSignature");
    });

    it("should fail: signer missing role", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);

      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));
      const raffleInstance: any = await raffleFactory.deploy();

      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver, amount);
      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });

      const accessInstance = await ethers.getContractAt("AccessControlFacet", exchangeInstance);
      await accessInstance.renounceRole(MINTER_ROLE, owner);

      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: ERC20InsufficientAllowance", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const raffleInstance: any = await raffleFactory.deploy();
      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.mint(receiver, amount);
      // await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );
      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
        .withArgs(exchangeInstance, 0, amount);
    });

    it("should fail: ERC20InsufficientBalance", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const generateSignature = await getSignatures(exchangeInstance);
      const erc20Instance = await deployERC20();
      const erc721TicketInstance = await deployERC721("ERC721RaffleTicket");

      const raffleFactory = await ethers.getContractFactory(getContractName("Raffle", network.name));

      const raffleInstance: any = await raffleFactory.deploy();
      await raffleInstance.startRound(
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 1,
          amount,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        0, // maxTicket count
      );

      await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

      await raffleInstance.grantRole(MINTER_ROLE, await exchangeInstance.getAddress());
      await erc721TicketInstance.grantRole(MINTER_ROLE, await raffleInstance.getAddress());

      const signature = await generateSignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: await raffleInstance.getAddress(),
          referrer: ZeroAddress,
          extra,
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
          tokenId: 121,
          amount,
        },
      });
      const tx1 = exchangeInstance.connect(receiver).purchaseRaffle(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: raffleInstance,
          referrer: ZeroAddress,
          extra,
        },
        {
          tokenType: 2n,
          token: erc721TicketInstance,
          tokenId: 0,
          amount: 1,
        },
        {
          tokenType: 1n,
          token: erc20Instance,
          tokenId: 121,
          amount,
        },
        signature,
      );

      await expect(tx1)
        .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientBalance")
        .withArgs(receiver, 0, amount);
    });
  });

  describe("ERROR", function () {
    it("should fail: EnforcedPause", async function () {
      const exchangeInstance = await factory();
      const pausableInstance = await ethers.getContractAt("PausableFacet", exchangeInstance);

      await pausableInstance.pause();

      const tx1 = exchangeInstance.purchaseRaffle(
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
