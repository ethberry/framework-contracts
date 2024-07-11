import { expect } from "chai";
import { ethers } from "hardhat";

describe("Prediction Contract Pause and Unpause", function () {
  let predictionContract;

  beforeEach(async function () {
    const Prediction = await ethers.getContractFactory("Prediction");
    predictionContract = await Prediction.deploy();
  });

  it("should pause and unpause the contract", async function () {
    // Check initial state
    expect(await predictionContract.paused()).to.equal(false);

    // Pause the contract
    await predictionContract.pause();
    expect(await predictionContract.paused()).to.equal(true);

    // Unpause the contract
    await predictionContract.unpause();
    expect(await predictionContract.paused()).to.equal(false);
  });
});
