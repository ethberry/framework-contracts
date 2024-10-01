import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@ethberry/contracts-constants";

export function shouldWhiteList(factory: () => Promise<any>) {
  describe("White list", function () {
    it("should fail: transfer from", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner);
      await contractInstance.mint(owner, amount);
      await contractInstance.unWhitelist(owner);

      const tx1 = contractInstance.transfer(receiver, amount);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner);

      await contractInstance.approve(owner, amount);

      const tx2 = contractInstance.transferFrom(owner, receiver, amount);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner);
    });

    it("should fail: transferFrom to", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner);
      await contractInstance.mint(owner, amount);
      await contractInstance.unWhitelist(receiver);

      const tx1 = contractInstance.transfer(receiver, amount);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(receiver);

      await contractInstance.approve(owner, amount);

      const tx2 = contractInstance.transferFrom(owner, receiver, amount);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(receiver);
    });

    it("should fail: transfer approved", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner);
      await contractInstance.mint(owner, amount);
      await contractInstance.unWhitelist(owner);
      await contractInstance.approve(stranger, amount);

      const tx = contractInstance.connect(stranger).transferFrom(owner, receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner);
    });

    it("should fail: mint", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.mint(owner, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner);
    });

    it("should fail: burn", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.whitelist(owner);
      await contractInstance.mint(owner, amount);
      await contractInstance.unWhitelist(owner);

      const tx = contractInstance.burn(amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WhiteListError").withArgs(owner);
    });
  });
}
