import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

import { shouldStartPrediction } from "./start";
import { shouldBetPosition } from "./bet";
import { shouldBetPositionNative } from "./nativeBet";
import { shouldResolvePrediction } from "./resolve";
import { shouldClaim } from "./claim";

export function shouldBehaveLikePredictionContract(factory: () => Promise<any>, isVerbose = false) {
  describe("prediction behavior with erc20 tokens", function () {
    //.predictionBehavior
    shouldStartPrediction(factory, isVerbose);
    shouldBetPosition(factory, isVerbose);
    shouldResolvePrediction(factory, isVerbose);
    shouldClaim(factory, isVerbose);
  });
}

export function shouldBehaveLikePredictionContractWithNative(factory: () => Promise<any>, isVerbose = false) {
  describe("prediction behavior with native bets", function () {
    //.deployContractWithActivePrediction
    const deployContractWithActivePrediction = async (): any => {
      const state = await factory();
      const { prediction, bettor1, bettor2, betAsset } = state;

      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = startTimestamp + BigInt(time.duration.hours(1));
      const expiryTimestamp = endTimestamp + BigInt(time.duration.hours(1));

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      const initialBalance1 = await ethers.provider.getBalance(bettor1.address);
      const initialBalance2 = await ethers.provider.getBalance(bettor2.address);

      return {
        ...state,
        startTimestamp,
        endTimestamp,
        expiryTimestamp,
        initialBalance1,
        initialBalance2
      };
    };

    shouldBetPositionNative(deployContractWithActivePrediction, isVerbose);
  });
}
