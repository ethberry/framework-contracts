import { expect } from "chai";
import { ethers } from "hardhat";

import { MINTER_ROLE } from "@ethberry/contracts-constants";

import { templateId } from "../../../../../constants";

export function shouldMintBox(factory: () => Promise<any>) {
  describe("mintBox", function () {
    it("should fail: NoContent", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintBox(receiver, templateId, []);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "NoContent");
    });

    it("should fail: AccessControlUnauthorizedAccount", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = contractInstance.connect(receiver).mintBox(receiver, templateId, []);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver, MINTER_ROLE);
    });
  });
}
