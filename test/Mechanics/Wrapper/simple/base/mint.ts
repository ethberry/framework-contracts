import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@ethberry/contracts-constants";

import { templateId } from "../../../../constants";

export function shouldMintBox(factory: () => Promise<any>) {
  describe("mint", function () {
    it("should fail: NoContent", async function () {
      const [owner] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintBox(owner, templateId, [], { value: amount });
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "NoContent");
    });
  });
}
