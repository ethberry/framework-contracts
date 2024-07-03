import { expect } from "chai";
import { ethers } from "hardhat";

export function shouldPauseTheContract(factory: () => Promise<any>) {
  it("should pause the contract", async function () {
    const [owner] = await ethers.getSigners();
    const pausableFacet = await factory();
    await pausableFacet.connect(owner).pause();
    expect(await pausableFacet.paused()).to.be.true; // eslint-disable-line no-unused-expressions
  });
}
