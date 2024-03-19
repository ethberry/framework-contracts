import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

export function shouldWhiteList(factory: () => Promise<any>) {
  describe("White list", function () {
    it("should fail: transfer from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner.address);
      await contractInstance.mint(owner.address, amount);
      await contractInstance.unWhitelist(owner.address);

      const tx1 = contractInstance.transfer(receiver.address, amount);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner.address);

      await contractInstance.approve(owner.address, amount);

      const tx2 = contractInstance.transferFrom(owner.address, receiver.address, amount);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner.address);
    });

    it("should fail: transferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner.address);
      await contractInstance.mint(owner.address, amount);
      await contractInstance.unWhitelist(receiver.address);

      const tx1 = contractInstance.transfer(receiver.address, amount);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(receiver.address);

      await contractInstance.approve(owner.address, amount);

      const tx2 = contractInstance.transferFrom(owner.address, receiver.address, amount);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(receiver.address);
    });

    it("should fail: transfer approved", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner.address);
      await contractInstance.mint(owner.address, amount);
      await contractInstance.unWhitelist(owner.address);
      await contractInstance.approve(stranger.address, amount);

      const tx = contractInstance.connect(stranger).transferFrom(owner.address, receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner.address);
    });

    it("should fail: mint", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.mint(owner.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner.address);
    });

    it("should fail: burn", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner.address);
      await contractInstance.mint(owner.address, amount);
      await contractInstance.unWhitelist(owner.address);

      const tx = contractInstance.burn(amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner.address);
    });
  });
}
