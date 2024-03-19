import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

export function shouldBehaveLikeERC20BlackList(factory: () => Promise<any>) {
  describe("Black list", function () {
    it("should fail: BlackListError (transfer from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(owner.address);

      const tx = contractInstance.transfer(receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: BlackListError (transfer to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(receiver.address);

      const tx = contractInstance.transfer(receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (transferFrom from)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(owner.address);
      await contractInstance.approve(owner.address, amount);

      const tx = contractInstance.transferFrom(owner.address, receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: BlackListError (transferFrom to)", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(receiver.address);
      await contractInstance.approve(owner.address, amount);

      const tx = contractInstance.transferFrom(owner.address, receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (transferFrom approved)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(receiver.address);
      await contractInstance.approve(stranger.address, amount);

      const tx = contractInstance.connect(stranger).transferFrom(owner.address, receiver.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(receiver.address);
    });

    it("should fail: BlackListError (mint)", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.blacklist(owner.address);

      const tx = contractInstance.mint(owner.address, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });

    it("should fail: BlackListError (burn)", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await contractInstance.mint(owner.address, amount);
      await contractInstance.blacklist(owner.address);

      const tx = contractInstance.burn(amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "BlackListError").withArgs(owner.address);
    });
  });
}
