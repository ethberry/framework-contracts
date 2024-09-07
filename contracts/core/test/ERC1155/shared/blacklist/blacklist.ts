import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

import { tokenId } from "../../../constants";

export function shouldBehaveLikeERC1155BlackList(factory: () => Promise<any>) {
  describe("Black list", function () {
    it("should fail: safeTransferFrom from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(owner);

      const tx = contractInstance.safeTransferFrom(owner, receiver, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });

    it("should fail: safeTransferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver);

      const tx = contractInstance.safeTransferFrom(owner, receiver, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: safeTransferFrom approved", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver);
      await contractInstance.setApprovalForAll(stranger, true);

      const tx = contractInstance.connect(stranger).safeTransferFrom(owner, receiver, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: safeBatchTransferFrom from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(owner);

      const tx = contractInstance.safeBatchTransferFrom(owner, receiver, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });

    it("should fail: safeBatchTransferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver);

      const tx = contractInstance.safeBatchTransferFrom(owner, receiver, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: safeBatchTransferFrom approve", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver);
      await contractInstance.setApprovalForAll(stranger, true);

      const tx = contractInstance.connect(stranger).safeBatchTransferFrom(owner, receiver, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });
  });
}
