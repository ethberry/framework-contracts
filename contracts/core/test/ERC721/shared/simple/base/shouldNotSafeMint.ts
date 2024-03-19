import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldNotSafeMint(factory: () => Promise<any>) {
  describe("safeMint", function () {
    it("should fail: MethodNotSupported", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();
      const tx = contractInstance.safeMint(receiver.address);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "MethodNotSupported");
    });
  });
}
