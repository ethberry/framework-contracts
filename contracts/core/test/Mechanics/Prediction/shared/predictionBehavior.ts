import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";

import { shouldStartPrediction } from "./start";
import { shouldBetPosition } from "./bet";
import { shouldBetPositionNative } from "./nativeBet";
import { shouldResolvePrediction } from "./resolve";
import { shouldClaim } from "./claim";

export function shouldBehaveLikePredictionContract(factory: () => Promise<any>, isVerbose = false) {
  describe("prediction behavior", function () {
    //.deployContractWithFundedBettors
    const deployContractWithFundedBettors = async (): any => {
      const state = await factory();
      const { betAsset, bettor1, bettor2, token, prediction } = state;

      const betUnits1 = BigInt(3);
      const betUnits2 = BigInt(5);

      await token.mint(bettor1, betAsset.amount * betUnits1);
      await token.mint(bettor2, betAsset.amount * betUnits2);
      await token.connect(bettor1).approve(prediction, betAsset.amount * betUnits1);
      await token.connect(bettor2).approve(prediction, betAsset.amount * betUnits2);

      const initialBalance1 = await token.balanceOf(bettor1.address);
      const initialBalance2 = await token.balanceOf(bettor2.address);

      return {
        ...state,
        initialBalance1,
        initialBalance2,
        betUnits1,
        betUnits2
      };
    };

    //.deployContractWithActivePrediction
    const deployContractWithActivePrediction = async (): any => {
      const state = await deployContractWithFundedBettors();
      const { prediction, token, bettor1, bettor2, betAsset } = state;

      const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
      const endTimestamp = BigInt(startTimestamp) + BigInt(time.duration.hours(1));
      const expiryTimestamp = BigInt(endTimestamp) + BigInt(time.duration.hours(1));

      await prediction.startPrediction(startTimestamp, endTimestamp, expiryTimestamp, betAsset);

      await time.increaseTo(startTimestamp + BigInt(time.duration.seconds(10)));

      return {
        ...state,
        startTimestamp,
        endTimestamp,
        expiryTimestamp
      };
    };

    //.deployContractWithFundedPrediction
    const deployContractWithFundedPrediction = async (): any => {
      const state = await deployContractWithActivePrediction();
      const { prediction, bettor1, bettor2, betUnits1, betUnits2, ...params } = state;
      
      await prediction.connect(bettor1).placeBet(1, betUnits1, 0); // Position.LEFT
      await prediction.connect(bettor2).placeBet(1, betUnits2, 1); // Position.RIGHT

      return { ...state };
    };

    //.predictionBehavior
    shouldStartPrediction(factory, isVerbose);
    shouldBetPosition(factory, isVerbose);
    shouldResolvePrediction(deployContractWithActivePrediction, isVerbose);
    shouldClaim(deployContractWithFundedPrediction, isVerbose);
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
