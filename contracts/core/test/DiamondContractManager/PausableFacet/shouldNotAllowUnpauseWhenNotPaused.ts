import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldNotAllowUnpauseWhenNotPaused(factory: () => Promise<any>) {
  it("should not allow unpause when not paused", async function () {
    const [owner] = await ethers.getSigners();
    const pausableFacet = await factory();
    await expect(pausableFacet.connect(owner).unpause()).to.be.revertedWith("Pausable: not paused");
  });
}
