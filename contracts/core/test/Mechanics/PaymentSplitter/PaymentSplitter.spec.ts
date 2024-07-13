import { expect } from "chai";
import { ethers } from "hardhat";

import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { amount, InterfaceId } from "@gemunion/contracts-constants";

import { deployPaymentSplitter } from "./fixture";

describe("PaymentSplitter", function () {
  const factory = () => deployPaymentSplitter();

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);

  describe("totalShares", function () {
    it("should get total shares", async function () {
      const contractInstance = await deployPaymentSplitter();

      const totalShares = await contractInstance.totalShares();
      expect(totalShares).to.equal(200);
    });
  });

  describe("receive", function () {
    it("should get total shares", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await deployPaymentSplitter();

      const tx = owner.sendTransaction({
        to: await contractInstance.getAddress(),
        value: amount,
      });

      await expect(tx).to.emit(contractInstance, "PaymentReceived").withArgs(owner.address, amount);
      await expect(tx).to.changeEtherBalances([owner, contractInstance], [-amount, amount]);
    });
  });
});
