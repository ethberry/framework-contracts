import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount, DEFAULT_ADMIN_ROLE, InterfaceId, MINTER_ROLE } from "@gemunion/contracts-constants";
import { shouldSupportsInterface, deployContract } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { templateId, tokenId } from "../../constants";
import { deployERC1363 } from "../../ERC20/shared/fixtures";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { deployERC1155 } from "../../ERC1155/shared/fixtures";
import { shouldBehaveLikeERC721Simple } from "../../ERC721/shared/simple";
import { shouldNotMintCommon } from "../../ERC721/shared/shouldNotMintCommon";
import { customMintBoxERC721 } from "../../ERC721/shared/customMintFn";

describe("Wrapper", function () {
  const factory = () => deployERC721("ERC721Wrapper");
  const erc20Factory = (name: string) => deployERC1363(name);
  const erc721Factory = (name: string) => deployERC721(name);
  const erc998Factory = (name: string) => deployERC721(name);
  const erc1155Factory = (name: string) => deployERC1155(name);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE, MINTER_ROLE);
  shouldBehaveLikeERC721Simple(factory, { mint: customMintBoxERC721, safeMint: customMintBoxERC721, tokenId });
  shouldNotMintCommon(factory);
  shouldSupportsInterface(factory)([
    InterfaceId.IERC165,
    InterfaceId.IAccessControl,
    InterfaceId.IERC721,
    InterfaceId.IERC1155Receiver,
  ]);

  describe("mintBox", function () {
    it("should fail: NoContent", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintBox(owner.address, templateId, [], { value: amount });
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "NoContent");
    });
  });

  describe("mint/unpack", function () {
    it("should fail: ERC721InsufficientApproval", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const erc721WrapperInstance = await factory();

      const tx = erc721WrapperInstance.mintBox(
        owner.address,
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
      await expect(tx).to.changeEtherBalances([owner, erc721WrapperInstance], [-amount, amount]);

      const tx1 = erc721WrapperInstance.connect(receiver).unpack(tokenId);
      await expect(tx1)
        .to.be.revertedWithCustomError(erc721WrapperInstance, "ERC721InsufficientApproval")
        .withArgs(receiver.address, tokenId);
    });

    describe("NATIVE", function () {
      it("should mint/unpack NATIVE", async function () {
        const [owner] = await ethers.getSigners();

        const erc721WrapperInstance = await factory();

        const tx = erc721WrapperInstance.mintBox(
          owner.address,
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
        await expect(tx).to.changeEtherBalances([owner, erc721WrapperInstance], [-amount, amount]);

        const tx1 = erc721WrapperInstance.unpack(tokenId);
        await expect(tx1).to.changeEtherBalances([owner, erc721WrapperInstance], [amount, -amount]);
      });
    });

    describe("ERC20", function () {
      it("should mint/unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc20Instance = await erc20Factory("ERC20Simple");
        const erc721WrapperInstance = await factory();

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await erc721WrapperInstance.getAddress(), amount);

        const tx = erc721WrapperInstance.mintBox(owner.address, templateId, [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ]);
        await expect(tx).to.emit(erc20Instance, "Transfer");
        await expect(tx).to.changeTokenBalances(erc20Instance, [owner, erc721WrapperInstance], [-amount, amount]);

        const tx1 = erc721WrapperInstance.unpack(tokenId);
        await expect(tx1).to.emit(erc20Instance, "Transfer");
        await expect(tx1).to.changeTokenBalances(erc20Instance, [owner, erc721WrapperInstance], [amount, -amount]);
      });

      it("should mint/unpack (ERC1363) ", async function () {
        const [owner] = await ethers.getSigners();

        const erc20Instance = await erc20Factory("ERC20Simple");
        const erc721WrapperInstance = await factory();
        const walletMockInstance = await deployContract("WrapperMock");

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await erc721WrapperInstance.getAddress(), amount);

        const tx = erc721WrapperInstance.mintBox(owner.address, templateId, [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ]);
        await expect(tx).to.emit(erc20Instance, "Transfer");
        await expect(tx).to.changeTokenBalances(erc20Instance, [owner, erc721WrapperInstance], [-amount, amount]);
        await expect(tx).to.emit(erc721WrapperInstance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);

        await erc721WrapperInstance.transferFrom(owner.address, await walletMockInstance.getAddress(), tokenId);

        // Calling WrapperWalletMock.unpack
        const tx1 = walletMockInstance.unpack(await erc721WrapperInstance.getAddress(), tokenId);
        await expect(tx1)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(await erc721WrapperInstance.getAddress(), await walletMockInstance.getAddress(), amount);
        await expect(tx1).to.emit(erc721WrapperInstance, "UnpackWrapper");
        await expect(tx1).to.emit(walletMockInstance, "TransferReceived");
        await expect(tx1).to.changeTokenBalances(
          erc20Instance,
          [walletMockInstance, erc721WrapperInstance],
          [amount, -amount],
        );
      });
    });

    describe("ERC721", function () {
      it("should mint/unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc721Instance = await erc721Factory("ERC721Simple");
        const erc721WrapperInstance = await factory();

        await erc721Instance.mintCommon(owner.address, templateId);
        await erc721Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        await erc721WrapperInstance.mintBox(owner.address, templateId, [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1n,
          },
        ]);
        const balanace = await erc721Instance.balanceOf(await erc721WrapperInstance.getAddress());
        expect(balanace).to.be.equal(1);

        await erc721WrapperInstance.unpack(tokenId);
        const balanace2 = await erc721Instance.balanceOf(await erc721WrapperInstance.getAddress());
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("ERC998", function () {
      it("should mint/unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc998Instance = await erc998Factory("ERC998Simple");
        const erc721WrapperInstance = await factory();

        await erc998Instance.mintCommon(owner.address, templateId);
        await erc998Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        await erc721WrapperInstance.mintBox(owner.address, templateId, [
          {
            tokenType: 3,
            token: await erc998Instance.getAddress(),
            tokenId,
            amount: 1n,
          },
        ]);
        const balanace = await erc998Instance.balanceOf(await erc721WrapperInstance.getAddress());
        expect(balanace).to.be.equal(1);

        await erc721WrapperInstance.unpack(1);
        const balanace2 = await erc998Instance.balanceOf(await erc721WrapperInstance.getAddress());
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("ERC1155", function () {
      it("should mint/unpack", async function () {
        const [owner] = await ethers.getSigners();

        const erc1155Instance = await erc1155Factory("ERC1155Simple");
        const erc721WrapperInstance = await factory();

        await erc1155Instance.mint(owner.address, templateId, amount, "0x");
        await erc1155Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        await erc721WrapperInstance.mintBox(owner.address, templateId, [
          {
            tokenType: 4,
            token: await erc1155Instance.getAddress(),
            tokenId,
            amount,
          },
        ]);
        const balanace = await erc1155Instance.balanceOf(await erc721WrapperInstance.getAddress(), tokenId);
        expect(balanace).to.be.equal(amount);

        await erc721WrapperInstance.unpack(tokenId);
        const balanace2 = await erc1155Instance.balanceOf(await erc721WrapperInstance.getAddress(), tokenId);
        expect(balanace2).to.be.equal(0);
      });
    });

    describe("MIX", function () {
      it("should fail: ERC20InsufficientAllowance", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const erc20Instance = await erc20Factory("ERC20Simple");
        const erc721WrapperInstance = await factory();

        await erc20Instance.mint(receiver.address, amount);
        await erc20Instance.connect(receiver).approve(await erc721WrapperInstance.getAddress(), amount);

        const tx = erc721WrapperInstance.mintBox(receiver.address, templateId, [
          {
            tokenType: 1,
            token: await erc20Instance.getAddress(),
            tokenId,
            amount,
          },
        ]);
        await expect(tx)
          .to.be.revertedWithCustomError(erc20Instance, "ERC20InsufficientAllowance")
          .withArgs(await erc721WrapperInstance.getAddress(), 0, amount);
      });

      it("should mint/unpack ALL", async function () {
        const [owner] = await ethers.getSigners();

        const erc721WrapperInstance = await factory();

        const erc20Instance = await erc20Factory("ERC20Simple");
        const erc721Instance = await erc721Factory("ERC721Simple");
        const erc998Instance = await erc998Factory("ERC998Simple");
        const erc1155Instance = await erc1155Factory("ERC1155Simple");

        await erc20Instance.mint(owner.address, amount);
        await erc20Instance.approve(await erc721WrapperInstance.getAddress(), amount);

        await erc721Instance.mintCommon(owner.address, templateId);
        await erc721Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        await erc1155Instance.mint(owner.address, templateId, amount, "0x");
        await erc1155Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        await erc998Instance.mintCommon(owner.address, templateId);
        await erc998Instance.setApprovalForAll(await erc721WrapperInstance.getAddress(), true);

        const balanace01 = await erc1155Instance.balanceOf(owner.address, tokenId);
        expect(balanace01).to.be.equal(amount);
        const balanace02 = await erc721Instance.balanceOf(owner.address);
        expect(balanace02).to.be.equal(1);
        const balanace03 = await erc998Instance.balanceOf(owner.address);
        expect(balanace03).to.be.equal(1);

        const tx1 = erc721WrapperInstance.mintBox(
          owner.address,
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
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 3,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          { value: amount },
        );
        await expect(tx1).to.changeTokenBalances(erc20Instance, [owner, erc721WrapperInstance], [-amount, amount]);
        await expect(tx1).to.changeEtherBalances([owner, erc721WrapperInstance], [-amount, amount]);
        const balanace11 = await erc721Instance.balanceOf(owner.address);
        expect(balanace11).to.be.equal(0);
        const balanace12 = await erc998Instance.balanceOf(owner.address);
        expect(balanace12).to.be.equal(0);
        const balanace13 = await erc1155Instance.balanceOf(owner.address, tokenId);
        expect(balanace13).to.be.equal(0);

        const tx2 = erc721WrapperInstance.unpack(tokenId);
        await expect(tx2).to.changeTokenBalances(erc20Instance, [owner, erc721WrapperInstance], [amount, -amount]);
        await expect(tx2).to.changeEtherBalances([owner, erc721WrapperInstance], [amount, -amount]);
        const balanace21 = await erc721Instance.balanceOf(owner.address);
        expect(balanace21).to.be.equal(1);
        const balanace22 = await erc998Instance.balanceOf(owner.address);
        expect(balanace22).to.be.equal(1);
        const balanace23 = await erc1155Instance.balanceOf(owner.address, tokenId);
        expect(balanace23).to.be.equal(amount);
      });
    });
  });
});
