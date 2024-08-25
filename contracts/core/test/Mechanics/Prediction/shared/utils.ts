import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { ContractTransactionResponse } from "ethers";

export const treasuryFee = BigInt(1000);

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

export enum TokenType {
  NATIVE,
  ERC20,
  ERC721,
  ERC998,
  ERC1155,
}

export async function makeTimestamps() {
  const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
  const endTimestamp = BigInt(startTimestamp) + BigInt(time.duration.hours(1));
  const expiryTimestamp = BigInt(endTimestamp) + BigInt(time.duration.hours(1));

  return { expiryTimestamp, endTimestamp, startTimestamp };
}

export async function fundAndBet(prediction, bettor, params): Promise<ContractTransactionResponse> {
  const predictionDetails = await prediction.getPrediction(params.predictionId);
  const betAsset = predictionDetails.betAsset;
  const tokenType = betAsset[0];
  const amount = betAsset[3];

  const betAmount = amount * BigInt(params.multiplier);

  if (Number(tokenType) === TokenType.NATIVE) {
    return prediction.connect(bettor).placeBet(params.predictionId, params.multiplier, params.position, {
      value: betAmount,
    }) as ContractTransactionResponse;
  } else {
    const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
    await token.mint(bettor, betAmount);
    await token.connect(bettor).approve(prediction, betAmount);
    return prediction
      .connect(bettor)
      .placeBet(params.predictionId, params.multiplier, params.position) as ContractTransactionResponse;
  }
}

export async function getAssetBalance(betAsset, account) {
  if (betAsset.tokenType === TokenType.NATIVE) {
    return ethers.provider.getBalance(account);
  } else {
    const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
    return token.balanceOf(account);
  }
}
