import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@gemunion/contracts-constants";
import { deployERC1155Mock, deployERC1363Mock, deployERC20Mock, deployERC721Mock } from "@gemunion/contracts-mocks";
import { deployContract } from "@gemunion/contracts-utils";

import { deployERC721 } from "../../../../ERC721/shared/fixtures";
import { templateId, tokenId } from "../../../../constants";

export function shouldUnpackBox(factory: () => Promise<any>) {
  const erc998Factory = (name: string) => deployERC721(name);

  describe("mintBox", function () {
    describe("NATIVE", function () {
      it("should unpack NATIVE", async function () {
        const [owner] = await ethers.getSigners();

        const wrapperInstance = await factory();

        const tx = wrapperInstance.mintBox(
          owner,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          { value: amount },
        );
        await expect(tx).to.changeEtherBalances([owner, wrapperInstance], [-amount, amount]);

        const tx1 = wrapperInstance.unpack(tokenId);
        await expect(tx1).to.changeEtherBalances([owner, wrapperInstance], [amount, -amount]);
      });
    });

    describe("ERC20", function () {
      it("should unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc20Instance = await deployERC20Mock();
        const wrapperInstance = await factory();

        await erc20Instance.mint(owner, amount);
        await erc20Instance.approve(wrapperInstance, amount);

        const tx = wrapperInstance.mintBox(owner, templateId, [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ]);
        await expect(tx).to.emit(erc20Instance, "Transfer");
        await expect(tx).to.changeTokenBalances(erc20Instance, [owner, wrapperInstance], [-amount, amount]);

        const tx1 = wrapperInstance.unpack(tokenId);
        await expect(tx1).to.emit(erc20Instance, "Transfer");
        await expect(tx1).to.changeTokenBalances(erc20Instance, [owner, wrapperInstance], [amount, -amount]);
      });

      it("should unpack (ERC1363) ", async function () {
        const [owner] = await ethers.getSigners();

        const wrapperInstance = await factory();
        const erc20Instance = await deployERC1363Mock();
        const unpackerInstance = await deployContract("Unpacker");

        await erc20Instance.mint(owner, amount);
        await erc20Instance.approve(wrapperInstance, amount);

        const tx = wrapperInstance.mintBox(owner, templateId, [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ]);
        await expect(tx)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(owner, wrapperInstance, amount)
          .to.emit(wrapperInstance, "Transfer")
          .withArgs(ZeroAddress, owner, tokenId);
        await expect(tx).to.changeTokenBalances(erc20Instance, [owner, wrapperInstance], [-amount, amount]);

        const tx1 = await wrapperInstance.transferFrom(owner, unpackerInstance, tokenId);
        await expect(tx1).to.emit(wrapperInstance, "Transfer").withArgs(owner, unpackerInstance, tokenId);

        const tx2 = unpackerInstance.unpack(wrapperInstance, tokenId);
        await expect(tx2)
          .to.emit(wrapperInstance, "Transfer")
          .withArgs(unpackerInstance, ZeroAddress, tokenId)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(wrapperInstance, unpackerInstance, amount)
          .to.emit(wrapperInstance, "UnpackWrapper")
          .withArgs(unpackerInstance, tokenId)
          .to.emit(unpackerInstance, "TransferReceived")
          .withArgs(wrapperInstance, wrapperInstance, amount, "0x");
        await expect(tx2).to.changeTokenBalances(erc20Instance, [unpackerInstance, wrapperInstance], [amount, -amount]);
      });
    });

    describe("ERC721", function () {
      it("should unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc721Instance = await deployERC721Mock();
        const wrapperInstance = await factory();

        await erc721Instance.mint(owner, tokenId);
        await erc721Instance.setApprovalForAll(wrapperInstance, true);

        await wrapperInstance.mintBox(owner, templateId, [
          {
            tokenType: 2,
            token: erc721Instance,
            tokenId,
            amount: 1n,
          },
        ]);
        const balanace = await erc721Instance.balanceOf(wrapperInstance);
        expect(balanace).to.be.equal(1);

        await wrapperInstance.unpack(tokenId);
        const balanace2 = await erc721Instance.balanceOf(wrapperInstance);
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("ERC998", function () {
      it("should unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc998Instance = await erc998Factory("ERC998Simple");
        const wrapperInstance = await factory();

        await erc998Instance.mintCommon(owner, templateId);
        await erc998Instance.setApprovalForAll(wrapperInstance, true);

        await wrapperInstance.mintBox(owner, templateId, [
          {
            tokenType: 3,
            token: erc998Instance,
            tokenId,
            amount: 1n,
          },
        ]);
        const balanace = await erc998Instance.balanceOf(wrapperInstance);
        expect(balanace).to.be.equal(1);

        await wrapperInstance.unpack(1);
        const balanace2 = await erc998Instance.balanceOf(wrapperInstance);
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("ERC1155", function () {
      it("should unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc1155Instance = await deployERC1155Mock();
        const wrapperInstance = await factory();

        await erc1155Instance.mint(owner, templateId, amount, "0x");
        await erc1155Instance.setApprovalForAll(wrapperInstance, true);

        await wrapperInstance.mintBox(owner, templateId, [
          {
            tokenType: 4,
            token: erc1155Instance,
            tokenId,
            amount,
          },
        ]);
        const balanace = await erc1155Instance.balanceOf(wrapperInstance, tokenId);
        expect(balanace).to.be.equal(amount);

        await wrapperInstance.unpack(tokenId);
        const balanace2 = await erc1155Instance.balanceOf(wrapperInstance, tokenId);
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("MIX", function () {
      it("should unpack MIX", async function () {
        const [owner] = await ethers.getSigners();

        const wrapperInstance = await factory();

        const erc20Instance = await deployERC1363Mock();
        const erc721Instance = await deployERC721Mock();
        const erc998Instance = await erc998Factory("ERC998Simple");
        const erc1155Instance = await deployERC1155Mock();

        await erc20Instance.mint(owner, amount);
        await erc20Instance.approve(wrapperInstance, amount);

        await erc721Instance.mint(owner, tokenId);
        await erc721Instance.setApprovalForAll(wrapperInstance, true);

        await erc1155Instance.mint(owner, templateId, amount, "0x");
        await erc1155Instance.setApprovalForAll(wrapperInstance, true);

        await erc998Instance.mintCommon(owner, templateId);
        await erc998Instance.setApprovalForAll(wrapperInstance, true);

        const balanace01 = await erc1155Instance.balanceOf(owner, tokenId);
        expect(balanace01).to.be.equal(amount);
        const balanace02 = await erc721Instance.balanceOf(owner);
        expect(balanace02).to.be.equal(1);
        const balanace03 = await erc998Instance.balanceOf(owner);
        expect(balanace03).to.be.equal(1);

        const tx1 = wrapperInstance.mintBox(
          owner,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
            {
              tokenType: 1,
              token: erc20Instance,
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount,
            },
            {
              tokenType: 3,
              token: erc998Instance,
              tokenId,
              amount,
            },
            {
              tokenType: 4,
              token: erc1155Instance,
              tokenId,
              amount,
            },
          ],
          { value: amount },
        );
        await expect(tx1).to.changeTokenBalances(erc20Instance, [owner, wrapperInstance], [-amount, amount]);
        await expect(tx1).to.changeEtherBalances([owner, wrapperInstance], [-amount, amount]);
        const balanace11 = await erc721Instance.balanceOf(owner);
        expect(balanace11).to.be.equal(0);
        const balanace12 = await erc998Instance.balanceOf(owner);
        expect(balanace12).to.be.equal(0);
        const balanace13 = await erc1155Instance.balanceOf(owner, tokenId);
        expect(balanace13).to.be.equal(0);

        const tx2 = wrapperInstance.unpack(tokenId);
        await expect(tx2).to.changeTokenBalances(erc20Instance, [owner, wrapperInstance], [amount, -amount]);
        await expect(tx2).to.changeEtherBalances([owner, wrapperInstance], [amount, -amount]);
        const balanace21 = await erc721Instance.balanceOf(owner);
        expect(balanace21).to.be.equal(1);
        const balanace22 = await erc998Instance.balanceOf(owner);
        expect(balanace22).to.be.equal(1);
        const balanace23 = await erc1155Instance.balanceOf(owner, tokenId);
        expect(balanace23).to.be.equal(amount);
      });
    });

    describe("ERROR", function () {
      it("should fail: ERC20InsufficientAllowance", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const erc20Instance = await deployERC1363Mock();
        const wrapperInstance = await factory();

        await erc20Instance.mint(receiver, amount);
        // await erc20Instance.approve(wrapperInstance, amount);

        const tx = wrapperInstance.mintBox(receiver, templateId, [
          {
            tokenType: 1,
            token: erc20Instance,
            tokenId,
            amount,
          },
        ]);

        await expect(tx)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
          .withArgs(wrapperInstance, 0, amount);
      });

      it("should fail: ERC721InsufficientApproval", async function () {
        const [owner, receiver] = await ethers.getSigners();

        const wrapperInstance = await factory();

        const tx = wrapperInstance.mintBox(
          owner,
          templateId,
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId: 0,
              amount,
            },
          ],
          { value: amount },
        );
        await expect(tx).to.changeEtherBalances([owner, wrapperInstance], [-amount, amount]);

        const tx1 = wrapperInstance.connect(receiver).unpack(tokenId);
        await expect(tx1)
          .to.be.revertedWithCustomError(wrapperInstance, "ERC721InsufficientApproval")
          .withArgs(receiver, tokenId);
      });
    });
  });
}
