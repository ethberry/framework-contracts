import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, parseEther, ZeroAddress } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";

import { VRFCoordinatorV2Mock } from "../../../../../../typechain-types";
import { subscriptionId, templateId, tokenId } from "../../../../../constants";
import { randomFixRequest } from "../../../../../shared/randomRequest";
import { deployLinkVrfFixture } from "../../../../../shared/link";
import { deployERC1155 } from "../../../../../ERC1155/shared/fixtures";
import { deployERC721 } from "../../../../../ERC721/shared/fixtures";
import { deployERC1363 } from "../../../../../ERC20/shared/fixtures";

export function shouldUnpackBoxA(factory: () => Promise<any>) {
  let vrfInstance: VRFCoordinatorV2Mock;

  const erc20Factory = (name: string) => deployERC1363(name);
  const erc721Factory = (name: string) => deployERC721(name);
  const erc1155Factory = (name: string) => deployERC1155(name);

  describe("Unpack box A", function () {
    before(async function () {
      if (network.name === "hardhat") {
        await network.provider.send("hardhat_reset");

        // https://github.com/NomicFoundation/hardhat/issues/2980
        ({ vrfInstance } = await loadFixture(function lootbox() {
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
        owner.address,
        templateId,
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: templateId,
            amount,
          },
        ],
        [{ min: 1, max: 1 }],
      );
      await expect(tx1).to.emit(lootBoxInstance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);

      const tx2 = lootBoxInstance.connect(receiver).unpack(tokenId);
      await expect(tx2)
        .to.be.revertedWithCustomError(lootBoxInstance, "ERC721InsufficientApproval")
        .withArgs(receiver.address, tokenId);
    });

    // describe("NATIVE", function () {
    //   it("should mint/unpack", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     await lootboxInstance.topUp(
    //       [
    //         {
    //           tokenType: 0,
    //           token: ZeroAddress,
    //           tokenId: 0,
    //           amount: parseEther("1.0"),
    //         },
    //       ],
    //       { value: parseEther("1.0") },
    //     );
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 0,
    //           token: ZeroAddress,
    //           tokenId: templateId,
    //           amount,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId);
    //     await expect(tx2).to.changeEtherBalances([receiver, lootboxInstance], [amount, -amount]);
    //   });
    // });
    //
    // describe("ERC20", function () {
    //   it("should mint/unpack", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc20SimpleInstance = await erc20Factory("ERC20Simple");
    //     await erc20SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //     await erc20SimpleInstance.mint(await lootboxInstance.getAddress(), amount);
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 1,
    //           token: await erc20SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(erc20SimpleInstance, "Transfer")
    //       .withArgs(await lootboxInstance.getAddress(), receiver.address, amount);
    //   });
    // });
    //
    // describe("ERC721", function () {
    //   it("should mint/unpack (Simple)", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc721SimpleInstance = await erc721Factory("ERC721Simple");
    //     await erc721SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 2,
    //           token: await erc721SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(erc721SimpleInstance, "Transfer")
    //       .withArgs(ZeroAddress, receiver.address, tokenId);
    //   });
    //
    //   it("should mint/unpack (Random)", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc721RandomInstance = await erc721Factory("ERC721Random");
    //     await erc721RandomInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     // Set VRFV2 Subscription
    //     const tx01 = erc721RandomInstance.setSubscriptionId(subscriptionId);
    //     await expect(tx01).to.emit(erc721RandomInstance, "VrfSubscriptionSet").withArgs(1);
    //
    //     const tx02 = vrfInstance.addConsumer(1, await erc721RandomInstance.getAddress());
    //     await expect(tx02)
    //       .to.emit(vrfInstance, "SubscriptionConsumerAdded")
    //       .withArgs(1, await erc721RandomInstance.getAddress());
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 2,
    //           token: await erc721RandomInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId);
    //
    //     // RANDOM
    //     await randomRequest(erc721RandomInstance, vrfInstance);
    //
    //     const balance = await erc721RandomInstance.balanceOf(receiver.address);
    //     expect(balance).to.equal(1);
    //   });
    // });
    //
    // describe("ERC998", function () {
    //   it("should mint/unpack (Simple)", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc998SimpleInstance = await erc998Factory("ERC998Simple");
    //     await erc998SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 2,
    //           token: await erc998SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(erc998SimpleInstance, "Transfer")
    //       .withArgs(ZeroAddress, receiver.address, tokenId);
    //   });
    //
    //   it("should mint/unpack (Random)", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc998RandomInstance = await erc998Factory("ERC998Random");
    //     await erc998RandomInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     // Set VRFV2 Subscription
    //     const tx01 = erc998RandomInstance.setSubscriptionId(subscriptionId);
    //     await expect(tx01).to.emit(erc998RandomInstance, "VrfSubscriptionSet").withArgs(1);
    //
    //     const tx02 = vrfInstance.addConsumer(1, await erc998RandomInstance.getAddress());
    //     await expect(tx02)
    //       .to.emit(vrfInstance, "SubscriptionConsumerAdded")
    //       .withArgs(1, await erc998RandomInstance.getAddress());
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 2,
    //           token: await erc998RandomInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId);
    //
    //     await randomRequest(erc998RandomInstance, vrfInstance);
    //
    //     const balance = await erc998RandomInstance.balanceOf(receiver.address);
    //     expect(balance).to.equal(1);
    //   });
    // });
    //
    // describe("ERC1155", function () {
    //   it("should mint/unpack", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //     const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");
    //
    //     await erc1155SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 4,
    //           token: await erc1155SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount,
    //         },
    //       ],
    //       { min: 1, max: 1 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(erc1155SimpleInstance, "TransferSingle")
    //       .withArgs(await lootboxInstance.getAddress(), ZeroAddress, receiver.address, tokenId, amount);
    //   });
    // });
    //
    // describe("MIX", function () {
    //   it("should mint/unpack multiple", async function () {
    //     const [_owner, receiver] = await ethers.getSigners();
    //
    //     const lootboxInstance = await factory();
    //
    //     const erc20SimpleInstance = await erc20Factory("ERC20Simple");
    //
    //     const erc721SimpleInstance = await erc721Factory("ERC721Simple");
    //     const erc998SimpleInstance = await erc721Factory("ERC998Simple");
    //     const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");
    //
    //     await erc20SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //     await erc721SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //     await erc998SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //     await erc1155SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
    //
    //     await lootboxInstance.topUp(
    //       [
    //         {
    //           tokenType: 0,
    //           token: ZeroAddress,
    //           tokenId: 0,
    //           amount: parseEther("1.0"),
    //         },
    //       ],
    //       { value: parseEther("1.0") },
    //     );
    //     await erc20SimpleInstance.mint(await lootboxInstance.getAddress(), amount);
    //
    //     const tx1 = lootboxInstance.mintBox(
    //       receiver.address,
    //       templateId,
    //       [
    //         {
    //           tokenType: 0,
    //           token: ZeroAddress,
    //           tokenId: templateId,
    //           amount,
    //         },
    //         {
    //           tokenType: 1,
    //           token: await erc20SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount,
    //         },
    //         {
    //           tokenType: 2,
    //           token: await erc721SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //         {
    //           tokenType: 3,
    //           token: await erc998SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount: 1n,
    //         },
    //         {
    //           tokenType: 4,
    //           token: await erc1155SimpleInstance.getAddress(),
    //           tokenId: templateId,
    //           amount,
    //         },
    //       ],
    //       { min: 5, max: 5 },
    //     );
    //
    //     await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);
    //
    //     const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
    //     await expect(tx2)
    //       .to.emit(lootboxInstance, "Transfer")
    //       .withArgs(receiver.address, ZeroAddress, tokenId)
    //       .to.emit(lootboxInstance, "UnpackLootBox")
    //       .withArgs(receiver.address, tokenId)
    //       .to.emit(erc20SimpleInstance, "Transfer")
    //       .withArgs(await lootboxInstance.getAddress(), receiver.address, amount)
    //       .to.emit(erc721SimpleInstance, "Transfer")
    //       .withArgs(ZeroAddress, receiver.address, tokenId)
    //       .to.emit(erc998SimpleInstance, "Transfer")
    //       .withArgs(ZeroAddress, receiver.address, tokenId)
    //       .to.emit(erc1155SimpleInstance, "TransferSingle")
    //       .withArgs(await lootboxInstance.getAddress(), ZeroAddress, receiver.address, tokenId, amount);
    //     await expect(tx2).to.changeEtherBalances([receiver, lootboxInstance], [amount, -amount]);
    //   });
    // });

    describe("MIX RANDOM", function () {
      before(async function () {
        await network.provider.send("hardhat_reset");

        // https://github.com/NomicFoundation/hardhat/issues/2980
        ({ vrfInstance } = await loadFixture(function shouldMintRandom() {
          return deployLinkVrfFixture();
        }));
      });

      async function setChainLink(contractInstance: Contract) {
        // Set VRFV2 Subscription
        const tx01 = contractInstance.setSubscriptionId(subscriptionId);
        await expect(tx01).to.emit(contractInstance, "VrfSubscriptionSet").withArgs(1);

        // Add Consumer to VRFV2
        const tx02 = vrfInstance.addConsumer(subscriptionId, await contractInstance.getAddress());
        await expect(tx02)
          .to.emit(vrfInstance, "SubscriptionConsumerAdded")
          .withArgs(subscriptionId, await contractInstance.getAddress());
      }

      it("should mint:1, unpack random: 1-5", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const lootboxInstance = await factory();

        const erc20SimpleInstance = await erc20Factory("ERC20Simple");

        const erc721SimpleInstance = await erc721Factory("ERC721Simple");
        const erc998SimpleInstance = await erc721Factory("ERC998Simple");
        const erc1155SimpleInstance = await erc1155Factory("ERC1155Simple");

        await erc20SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
        await erc721SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
        await erc998SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());
        await erc1155SimpleInstance.grantRole(MINTER_ROLE, await lootboxInstance.getAddress());

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
        await erc20SimpleInstance.mint(await lootboxInstance.getAddress(), amount);

        // BOX with 1 random 721 and 1 1155 with random amount
        const tx1 = lootboxInstance.mintBox(
          receiver.address,
          templateId,
          [
            {
              tokenType: 2,
              token: await erc721SimpleInstance.getAddress(),
              tokenId: templateId,
              amount: 1n,
            },
            {
              tokenType: 4,
              token: await erc1155SimpleInstance.getAddress(),
              tokenId: templateId,
              amount,
            },
          ],
          [{ min: 1, max: 1 },{ min: 0, max: 5 }],
        );

        await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

        const tx2 = lootboxInstance.connect(receiver).unpack(tokenId);
        await expect(tx2).to.emit(lootboxInstance, "UnpackLootBox").withArgs(receiver.address, tokenId);

        if (network.name === "hardhat") {
          await randomFixRequest(lootboxInstance, vrfInstance,33); // will get items[2].amount = 1;
        }

        const balance = await erc721SimpleInstance.balanceOf(receiver.address);
        expect(balance).to.equal(1);

        const balance2 = await erc1155SimpleInstance.balanceOf(receiver.address, 1);
        expect(balance2).to.equal(1);
      });
    });
  });
}
