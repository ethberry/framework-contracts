import { expect } from "chai";
import { ethers } from "hardhat";

import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";

import { tokenId } from "../../../constants";
import { customMintCommonERC721 } from "../customMintFn";

export function shouldBehaveLikeERC721Blacklist(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  const { mint = customMintCommonERC721, tokenId: defaultTokenId = tokenId } = options;
  describe("Black list", function () {
    it("should fail: BlackListError (transferFrom from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner);
      await contractInstance.blacklist(owner);
      const tx = contractInstance.transferFrom(owner, receiver, defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: BlackListError (transferFrom to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner);
      await contractInstance.blacklist(receiver);

      const tx = contractInstance.transferFrom(owner, receiver, defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (safeTransferFrom from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner);
      await contractInstance.blacklist(owner);

      const tx = contractInstance["safeTransferFrom(address,address,uint256)"](owner, receiver, defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: BlackListError (safeTransferFrom to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner);
      await contractInstance.blacklist(receiver);

      const tx = contractInstance["safeTransferFrom(address,address,uint256)"](owner, receiver, defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (transferFrom approved)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);
      await contractInstance.blacklist(receiver.address);
      await contractInstance.approve(receiver.address, defaultTokenId);

      const tx = contractInstance
        .connect(receiver)
        ["safeTransferFrom(address,address,uint256)"](owner, receiver, defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (mintCommon)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.blacklist(receiver);
      const tx = mint(contractInstance, owner, receiver);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (burn)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, receiver.address);
      await contractInstance.blacklist(receiver.address);

      const tx = contractInstance.connect(receiver).burn(defaultTokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });
  });
}
