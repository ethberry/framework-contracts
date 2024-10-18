import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@ethberry/contracts-constants";
import { deployERC1363Mock, deployERC20Mock } from "@ethberry/contracts-mocks";

export function shouldReceive(factory: () => Promise<any>) {
  describe("receive NATIVE", function () {
    it("should receive", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = owner.sendTransaction({
        to: contractInstance,
        value: amount,
      });

      await expect(tx).to.emit(contractInstance, "PaymentReceived").withArgs(owner, amount);
      await expect(tx).to.changeEtherBalances([owner, contractInstance], [-amount, amount]);
    });
  });

  describe("receive ERC20", function () {
    it("should receive", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const erc20Instance = await deployERC20Mock();

      const tx1 = await erc20Instance.mint(owner, amount);
      await expect(tx1).to.emit(erc20Instance, "Transfer").withArgs(ZeroAddress, owner, amount);

      const tx3 = erc20Instance.transfer(contractInstance, amount);
      await expect(tx3)
        .to.emit(erc20Instance, "Transfer")
        .withArgs(owner, contractInstance, amount)
        .to.not.emit(contractInstance, "TransferReceived");
    });
  });

  describe("receive ERC1363", function () {
    it("should receive", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const erc20Instance = await deployERC1363Mock();

      const tx1 = await erc20Instance.mint(owner, amount);
      await expect(tx1).to.emit(erc20Instance, "Transfer").withArgs(ZeroAddress, owner, amount);

      const tx3 = erc20Instance.transferAndCall(contractInstance, amount);
      await expect(tx3)
        .to.emit(erc20Instance, "Transfer")
        .withArgs(owner, contractInstance, amount)
        .to.emit(contractInstance, "TransferReceived")
        .withArgs(owner, owner, amount, "0x");
    });
  });
}
