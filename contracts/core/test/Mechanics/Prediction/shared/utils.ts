import { ethers } from "hardhat";
import { ContractTransactionResponse } from "ethers";
import { time } from "@openzeppelin/test-helpers";

import { TokenType } from "@gemunion/types-blockchain";

export enum Position {
  LEFT,
  RIGHT,
}

export enum Outcome {
  LEFT,
  RIGHT,
  DRAW,
  ERROR,
  EXPIRED,
}

export async function makeTimestamps() {
  const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
  const endTimestamp = BigInt(startTimestamp) + BigInt(time.duration.hours(1));
  const expiryTimestamp = BigInt(endTimestamp) + BigInt(time.duration.hours(1));

  return { expiryTimestamp, endTimestamp, startTimestamp };
}

export async function fundAndBet(
  predictionInstance: any,
  bettor: any,
  params: any,
): Promise<ContractTransactionResponse> {
  const predictionDetails = await predictionInstance.getPrediction(params.predictionId);
  const betAsset = predictionDetails.betAsset;
  const tokenType = betAsset[0];
  const amount = betAsset[3];

  const betAmount = amount * BigInt(params.multiplier);

  if (tokenType === BigInt(Object.values(TokenType).indexOf(TokenType.NATIVE))) {
    return prediction.connect(bettor).placeBet(params.predictionId, params.multiplier, params.position, {
      value: betAmount,
    }) as ContractTransactionResponse;
  } else {
    const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
    await token.mint(bettor, betAmount);
    await token.connect(bettor).approve(predictionInstance, betAmount);
    return predictionInstance
      .connect(bettor)
      .placeBet(params.predictionId, params.multiplier, params.position) as ContractTransactionResponse;
  }
}

export async function getAssetBalance(betAsset: any, account: any) {
  if (BigInt(betAsset.tokenType) === BigInt(Object.values(TokenType).indexOf(TokenType.NATIVE))) {
    return ethers.provider.getBalance(account);
  } else {
    const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
    return token.balanceOf(account);
  }
}
