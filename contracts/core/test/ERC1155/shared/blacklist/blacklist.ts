import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

import { tokenId } from "../../../constants";

export function shouldBehaveLikeERC1155BlackList(factory: () => Promise<any>) {
  describe("Black list", function () {
    it("should fail: safeTransferFrom from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(owner.address);

      const tx = contractInstance.safeTransferFrom(owner.address, receiver.address, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: safeTransferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver.address);

      const tx = contractInstance.safeTransferFrom(owner.address, receiver.address, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: safeTransferFrom approved", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver.address);
      await contractInstance.setApprovalForAll(stranger.address, true);

      const tx = contractInstance
        .connect(stranger)
        .safeTransferFrom(owner.address, receiver.address, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: safeBatchTransferFrom from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(owner.address);

      const tx = contractInstance.safeBatchTransferFrom(owner.address, receiver.address, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: safeBatchTransferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver.address);

      const tx = contractInstance.safeBatchTransferFrom(owner.address, receiver.address, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: safeBatchTransferFrom approve", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, tokenId, amount, "0x");
      await contractInstance.blacklist(receiver.address);
      await contractInstance.setApprovalForAll(stranger.address, true);

      const tx = contractInstance
        .connect(stranger)
        .safeBatchTransferFrom(owner.address, receiver.address, [tokenId], [amount], "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });
  });
}
