import { expect } from "chai";
import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";

import { tokenId } from "../../../constants";

export function shouldSafeBatchTransferFrom(factory: () => Promise<any>) {
  describe("shouldSafeTransferFrom", function () {
    it("should fail: can't be transferred", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();
      await contractInstance.mint(owner, tokenId, amount, "0x");
      const tx = contractInstance.safeTransferFrom(owner, receiver, tokenId, amount, "0x");
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "Soulbound");
    });
  });
}
