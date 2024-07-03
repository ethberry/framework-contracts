import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldNotAllowPauseWhenPaused(factory: () => Promise<any>) {
  it("should not allow pause when already paused", async function () {
    const [owner] = await ethers.getSigners();
    const pausableFacet = await factory();
    await pausableFacet.connect(owner).pause();
    await expect(pausableFacet.connect(owner).pause()).to.be.revertedWith("Pausable: paused");
  });
}
