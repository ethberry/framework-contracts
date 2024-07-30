import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, parseEther, ZeroAddress } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";
import { deployERC1363Mock, deployERC20Mock } from "@gemunion/contracts-mocks";

import { VRFCoordinatorV2PlusMock } from "../../../../../../typechain-types";
import { templateId, tokenId } from "../../../../../constants";
import { randomRequest } from "../../../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../../../shared/link";
import { deployERC1155 } from "../../../../../ERC1155/shared/fixtures";
import { deployERC721 } from "../../../../../ERC721/shared/fixtures";
import { deployContract } from "@gemunion/contracts-utils";

export function shouldUnpackBox(factory: () => Promise<any>) {
  let vrfInstance: VRFCoordinatorV2PlusMock;
  let subId: bigint;

  const erc721Factory = (name: string) => deployERC721(name);
  const erc998Factory = (name: string) => deployERC721(name);
  const erc1155Factory = (name: string) => deployERC1155(name);

  describe("Unpack box", function () {
    before(async function () {
      if (network.name === "hardhat") {
        await network.provider.send("hardhat_reset");

        // https://github.com/NomicFoundation/hardhat/issues/2980
        ({ vrfInstance, subId } = await loadFixture(function lootbox() {
          return deployLinkVrfFixture();
        }));
      }
    });

    it("should fail to unpack: caller is not owner nor approved", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const lootBoxInstance = await factory();
      await lootBoxInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );

      const tx1 = lootBoxInstance.mintBox(
        owner,
        templateId,
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: templateId,
            amount,
          },
        ],
        { min: 1, max: 1 },
      );
      await expect(tx1).to.emit(lootBoxInstance, "Transfer").withArgs(ZeroAddress, owner, tokenId);

      const tx2 = lootBoxInstance.connect(receiver).unpack(tokenId);
      await expect(tx2)
        .to.be.revertedWithCustomError(lootBoxInstance, "ERC721InsufficientApproval")
        .withArgs(receiver, tokenId);
    });

    describe("NATIVE", function () {
      it("should mint/unpack", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        await lootboxInstance.topUp(
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: 0,
              amount: parseEther("1.0"),
            },
          ],
          { value: parseEther("1.0") },
        );

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 1, max: 1 },
        );
        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId);
        await expect(tx2).to.changeEtherBalances([receiver, lootboxInstance], [amount, -amount]);
      });
    });

    describe("ERC20", function () {
      it("should mint/unpack", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc20SimpleInstance = await deployERC20Mock();
        await erc20SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc20SimpleInstance.mint(lootboxInstance, amount);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 1,
              token: erc20SimpleInstance,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 1, max: 1 },
        );
        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(erc20SimpleInstance, "Transfer")
          .withArgs(lootboxInstance, receiver, amount);
      });

      it("should mint/unpack(ERC1363)", async function () {
        const [owner] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc20Instance = await deployERC1363Mock();
        const unpackerInstance = await deployContract("Unpacker");

        await erc20Instance.mint(lootboxInstance, amount);

        const tx = lootboxInstance.mintBox(
          owner,
          templateId,
          [
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 1, max: 1 },
        );
        await expect(tx).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, owner, tokenId);

        const tx1 = await lootboxInstance.transferFrom(owner, unpackerInstance, tokenId);
        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(owner, unpackerInstance, tokenId);

        const tx2 = unpackerInstance.unpack(lootboxInstance, tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(unpackerInstance, ZeroAddress, tokenId)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(lootboxInstance, unpackerInstance, amount)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(unpackerInstance, tokenId);
        await expect(tx2).to.changeTokenBalances(erc20Instance, [unpackerInstance, lootboxInstance], [amount, -amount]);
      });
    });

    describe("ERC721", function () {
      it("should mint/unpack (Simple)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc721SimpleInstance = await erc721Factory("ERC721Simple");
        await erc721SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 2,
              token: erc721SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
          ],
          { min: 1, max: 1 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(erc721SimpleInstance, "Transfer")
          .withArgs(ZeroAddress, receiver, tokenId);
      });

      it("should mint/unpack (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc721RandomInstance = await erc721Factory("ERC721Random");
        await erc721RandomInstance.grantRole(MINTER_ROLE, lootboxInstance);

        // Set VRFV2 Subscription
        const tx01 = erc721RandomInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721RandomInstance, "VrfSubscriptionSet").withArgs(subId);

        const tx02 = vrfInstance.addConsumer(subId, erc721RandomInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721RandomInstance);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 2,
              token: erc721RandomInstance,
              tokenId: templateId,
              amount: 1n,
            },
          ],
          { min: 1, max: 1 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId);

        // RANDOM
        await randomRequest(erc721RandomInstance, vrfInstance);

        const balance = await erc721RandomInstance.balanceOf(receiver);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC998", function () {
      it("should mint/unpack (Simple)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc998SimpleInstance = await erc998Factory("ERC998Simple");
        await erc998SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 2,
              token: erc998SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
          ],
          { min: 1, max: 1 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(erc998SimpleInstance, "Transfer")
          .withArgs(ZeroAddress, receiver, tokenId);
      });

      it("should mint/unpack (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc998RandomInstance = await erc998Factory("ERC998Random");
        await erc998RandomInstance.grantRole(MINTER_ROLE, lootboxInstance);

        // Set VRFV2 Subscription
        const tx01 = erc998RandomInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc998RandomInstance, "VrfSubscriptionSet").withArgs(subId);

        const tx02 = vrfInstance.addConsumer(subId, erc998RandomInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc998RandomInstance);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 2,
              token: erc998RandomInstance,
              tokenId: templateId,
              amount: 1n,
            },
          ],
          { min: 1, max: 1 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId);

        await randomRequest(erc998RandomInstance, vrfInstance);

        const balance = await erc998RandomInstance.balanceOf(receiver);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC1155", function () {
      it("should mint/unpack", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();
        const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");

        await erc1155SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 4,
              token: erc1155SimpleInstance,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 1, max: 1 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(erc1155SimpleInstance, "TransferSingle")
          .withArgs(lootboxInstance, ZeroAddress, receiver, tokenId, amount);
      });
    });

    describe("MIX", function () {
      it("should mint/unpack multiple", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();

        const erc20SimpleInstance = await deployERC20Mock();

        const erc721SimpleInstance = await erc721Factory("ERC721Simple");
        const erc998SimpleInstance = await erc721Factory("ERC998Simple");
        const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");

        await erc20SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc721SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc998SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc1155SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);

        await lootboxInstance.topUp(
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: 0,
              amount: parseEther("1.0"),
            },
          ],
          { value: parseEther("1.0") },
        );
        await erc20SimpleInstance.mint(lootboxInstance, amount);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 1,
              token: erc20SimpleInstance,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 2,
              token: erc721SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 3,
              token: erc998SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 4,
              token: erc1155SimpleInstance,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 5, max: 5 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2)
          .to.emit(lootboxInstance, "Transfer")
          .withArgs(receiver, ZeroAddress, tokenId)
          .to.emit(lootboxInstance, "UnpackLootBox")
          .withArgs(receiver, tokenId)
          .to.emit(erc20SimpleInstance, "Transfer")
          .withArgs(lootboxInstance, receiver, amount)
          .to.emit(erc721SimpleInstance, "Transfer")
          .withArgs(ZeroAddress, receiver, tokenId)
          .to.emit(erc998SimpleInstance, "Transfer")
          .withArgs(ZeroAddress, receiver, tokenId)
          .to.emit(erc1155SimpleInstance, "TransferSingle")
          .withArgs(lootboxInstance, ZeroAddress, receiver, tokenId, amount);
        await expect(tx2).to.changeEtherBalances([receiver, lootboxInstance], [amount, -amount]);
      });
    });

    describe("MIX RANDOM", function () {
      let vrfInstance: VRFCoordinatorV2PlusMock;

      before(async function () {
        await network.provider.send("hardhat_reset");

        // https://github.com/NomicFoundation/hardhat/issues/2980
        ({ vrfInstance } = await loadFixture(function shouldMintRandom() {
          return deployLinkVrfFixture();
        }));
      });

      async function setChainLink(contractInstance: Contract) {
        // Set VRFV2 Subscription
        const tx01 = contractInstance.setSubscriptionId(subId);
        await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(subId);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subId, contractInstance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, contractInstance);
      }

      it("should mint:5, unpack: 1-5", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();

        const erc20SimpleInstance = await deployERC20Mock();

        const erc721SimpleInstance = await erc721Factory("ERC721Simple");
        const erc998SimpleInstance = await erc721Factory("ERC998Simple");
        const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");

        await erc20SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc721SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc998SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);
        await erc1155SimpleInstance.grantRole(MINTER_ROLE, lootboxInstance);

        // Set ChainLink
        await setChainLink(lootboxInstance);

        await lootboxInstance.topUp(
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: 0,
              amount: parseEther("1.0"),
            },
          ],
          { value: parseEther("1.0") },
        );
        await erc20SimpleInstance.mint(lootboxInstance, amount);

        const tx1 = lootboxInstance.mintBox(
          receiver,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 1,
              token: erc20SimpleInstance,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 2,
              token: erc721SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 3,
              token: erc998SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 4,
              token: erc1155SimpleInstance,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 1,
              token: erc20SimpleInstance,
              tokenId: templateId,
              amount,
            },
            {
              tokenType: 2,
              token: erc721SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 3,
              token: erc998SimpleInstance,
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 4,
              token: erc1155SimpleInstance,
              tokenId: templateId,
              amount,
            },
          ],
          { min: 0, max: 10 },
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2).to.emit(lootboxInstance, "UnpackLootBox").withArgs(receiver, tokenId);

        if (network.name === "hardhat") {
          await randomRequest(lootboxInstance, vrfInstance);
        }
      });
    });
  });
}
