import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress, parseEther } from "ethers";

import { MINTER_ROLE } from "@gemunion/contracts-constants";

import { templateId } from "../../../../../constants";

export function shouldMintBox(factory: () => Promise<any>) {
  describe("mint", function () {
    it("should fail: NoContent", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintBox(receiver, templateId, [], { min: 0, max: 0 });
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "NoContent");
    });

    it("should fail: InvalidMinMax", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const item = [
        {
          tokenType: 0,
          token: ZeroAddress,
          tokenId: 0,
          amount: parseEther("1.0"),
        },
      ];

      const tx1 = contractInstance.mintBox(receiver, templateId, item, { min: 0, max: 0 });
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "InvalidMinMax");

      const tx2 = contractInstance.mintBox(receiver, templateId, item, { min: 0, max: 2 });
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "InvalidMinMax");

      const tx3 = contractInstance.mintBox(receiver, templateId, item, { min: 2, max: 1 });
      await expect(tx3).to.be.revertedWithCustomError(contractInstance, "InvalidMinMax");
    });

    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.connect(receiver).mintBox(receiver, templateId, [], { min: 0, max: 0 });
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver, MINTER_ROLE);
    });
  });
}
