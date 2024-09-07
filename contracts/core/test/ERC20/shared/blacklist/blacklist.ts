import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

export function shouldBlacklist(factory: () => Promise<any>) {
  describe("Black list", function () {
    it("should fail: BlackListError (transfer from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(owner);

      const tx = contractInstance.transfer(receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });

    it("should fail: BlackListError (transfer to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(receiver);

      const tx = contractInstance.transfer(receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: BlackListError (transferFrom from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(owner);
      await contractInstance.approve(owner, amount);

      const tx = contractInstance.transferFrom(owner, receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });

    it("should fail: BlackListError (transferFrom to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(receiver);
      await contractInstance.approve(owner, amount);

      const tx = contractInstance.transferFrom(owner, receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: BlackListError (transferFrom approved)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(receiver);
      await contractInstance.approve(stranger, amount);

      const tx = contractInstance.connect(stranger).transferFrom(owner, receiver, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver);
    });

    it("should fail: BlackListError (mint)", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.blacklist(owner);

      const tx = contractInstance.mint(owner, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });

    it("should fail: BlackListError (burn)", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner, amount);
      await contractInstance.blacklist(owner);

      const tx = contractInstance.burn(amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner);
    });
  });
}
