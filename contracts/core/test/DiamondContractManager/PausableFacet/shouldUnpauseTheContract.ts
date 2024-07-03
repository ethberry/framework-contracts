import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldUnpauseTheContract(factory: () => Promise<any>) {
  it("should unpause the contract", async function () {
    const [owner] = await ethers.getSigners();
    const pausableFacet = await factory();
    await pausableFacet.connect(owner).pause();
    await pausableFacet.connect(owner).unpause();
    expect(await pausableFacet.paused()).to.be.false; // eslint-disable-line no-unused-expressions
  });
}
