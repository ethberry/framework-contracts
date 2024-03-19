import { expect } from "chai";
import { ethers } from "hardhat";
import { WeiPerEther } from "ethers";

export function shouldReceive(factory: () => Promise<any>) {
  describe("receive", function () {
    it("should fail: no reason", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = owner.sendTransaction({
        to: await contractInstance.getAddress(),
        value: WeiPerEther,
        gasLimit: 21000 + 61, // + revert
      });

      await expect(tx).to.be.revertedWithoutReason();
    });
  });
}
