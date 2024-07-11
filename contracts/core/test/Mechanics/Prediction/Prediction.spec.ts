import { expect } from "chai";

import { deployContract } from "@gemunion/contracts-utils";

describe("Prediction Contract Pause and Unpause", function () {
  let predictionContract;

  beforeEach(async function () {
    predictionContract = await deployContract("Prediction");
  });

  it("should pause and unpause the contract", async function () {
    // Check initial state
    const initialPausedState = await predictionContract.paused();
    expect(initialPausedState).to.equal(false);

    // Pause the contract
    await predictionContract.pause();
    const pausedState = await predictionContract.paused();
    expect(pausedState).to.equal(true);

    // Unpause the contract
    await predictionContract.unpause();
    const unPausedState = await predictionContract.paused();
    expect(unPausedState).to.equal(false);
  });
});
