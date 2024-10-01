import { expect } from "chai";
import { ethers } from "hardhat";
import { tokenId } from "../../../../../constants";

export function shouldNotMint(factory: () => Promise<any>) {
  describe("mint", function () {
    it("should fail: MethodNotSupported", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();
      const tx = contractInstance.mint(receiver.address, tokenId);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "MethodNotSupported");
    });
  });
}
