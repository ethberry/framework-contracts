import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@gemunion/contracts-constants";
import { deployJerk } from "@gemunion/contracts-mocks";
import type { IERC20Options } from "@gemunion/contracts-erc20";
import { defaultMintERC20 } from "@gemunion/contracts-erc20";

export function shouldTransferFrom(factory: () => Promise<any>, options: IERC20Options = {}) {
  const { mint = defaultMintERC20 } = options;

  describe("transferFrom", function () {
    it("should transfer", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);
      await contractInstance.approve(receiver.address, amount);

      const tx1 = contractInstance.whitelist(receiver.address);
      await expect(tx1).to.emit(contractInstance, "Whitelisted").withArgs(receiver.address);

      const tx2 = contractInstance.connect(receiver).transferFrom(owner.address, receiver.address, amount);
      await expect(tx2).to.emit(contractInstance, "Transfer").withArgs(owner.address, receiver.address, amount);

      const receiverBalance = await contractInstance.balanceOf(receiver.address);
      expect(receiverBalance).to.equal(amount);
      const balanceOfOwner = await contractInstance.balanceOf(owner.address);
      expect(balanceOfOwner).to.equal(0);
    });

    it("should transfer to contract", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();
      const erc20NonReceiverInstance = await deployJerk();

      await mint(contractInstance, owner, owner.address);
      await contractInstance.approve(receiver.address, amount);

      const tx1 = contractInstance.whitelist(await erc20NonReceiverInstance.getAddress());
      await expect(tx1)
        .to.emit(contractInstance, "Whitelisted")
        .withArgs(await erc20NonReceiverInstance.getAddress());

      const tx2 = contractInstance
        .connect(receiver)
        .transferFrom(owner.address, await erc20NonReceiverInstance.getAddress(), amount);
      await expect(tx2)
        .to.emit(contractInstance, "Transfer")
        .withArgs(owner.address, await erc20NonReceiverInstance.getAddress(), amount);

      const nonReceiverBalance = await contractInstance.balanceOf(await erc20NonReceiverInstance.getAddress());
      expect(nonReceiverBalance).to.equal(amount);
      const balanceOfOwner = await contractInstance.balanceOf(owner.address);
      expect(balanceOfOwner).to.equal(0);
    });

    it("should fail: ERC20InvalidReceiver", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);
      await contractInstance.approve(receiver.address, amount);
      const tx = contractInstance.connect(receiver).transferFrom(owner.address, ZeroAddress, amount);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "ERC20InvalidReceiver").withArgs(ZeroAddress);
    });

    it("should fail: ERC20InsufficientBalance", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, 0n);
      await contractInstance.approve(receiver.address, amount);

      const tx1 = contractInstance.whitelist(receiver.address);
      await expect(tx1).to.emit(contractInstance, "Whitelisted").withArgs(receiver.address);

      const tx2 = contractInstance.connect(receiver).transferFrom(owner.address, receiver.address, amount);
      await expect(tx2)
        .to.be.revertedWithCustomError(contractInstance, "ERC20InsufficientBalance")
        .withArgs(owner.address, 0, amount);
    });

    it("should fail: ERC20InsufficientAllowance", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);
      const tx = contractInstance.connect(receiver).transferFrom(owner.address, receiver.address, amount);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "ERC20InsufficientAllowance")
        .withArgs(receiver.address, 0, amount);
    });
  });
}
