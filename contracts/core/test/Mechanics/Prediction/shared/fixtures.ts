import { ethers } from "hardhat";
import { MaxUint256 } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { deployERC1363 } from "../../../ERC20/shared/fixtures";

export enum Position {
  LEFT,
  RIGHT
}

export enum Outcome {
  LEFT,
  RIGHT,
  DRAW,
  ERROR,
  EXPIRED
}

export async function makeTimestamps() {
  const startTimestamp = BigInt(await time.latest()) + BigInt(time.duration.minutes(1));
  const endTimestamp = BigInt(startTimestamp) + BigInt(time.duration.hours(1));
  const expiryTimestamp = BigInt(endTimestamp) + BigInt(time.duration.hours(1));

  return { expiryTimestamp, endTimestamp, startTimestamp }
}

export async function fundAndBet(prediction, bettor, params) {
  const predictionDetails = await prediction.getPrediction(params.predictionId);
  const betAsset = predictionDetails.betAsset;

  const token = await ethers.getContractAt("ERC20Simple", betAsset.token);
  await token.mint(bettor, betAsset.amount * BigInt(params.multiplier));
  await token.connect(bettor).approve(prediction, betAsset.amount * BigInt(params.multiplier));

  return prediction.connect(bettor).placeBet(params.predictionId, params.multiplier, params.position);
}

export async function deployPredictionContract() {
  const [owner, admin, bettor1, bettor2] = await ethers.getSigners();

  const token = await deployERC1363("ERC20Simple", { amount: MaxUint256 });

  const treasuryFee = BigInt(1000);

  const betAsset = {
    tokenType: 1,
    token: token.target,
    tokenId: 0,
    amount: ethers.parseUnits("5", 18),
  };

  const PredictionContractFactory = await ethers.getContractFactory("Prediction");
  const prediction = await PredictionContractFactory.connect(admin).deploy(treasuryFee);

  return { prediction, token, owner, admin, bettor1, bettor2, treasuryFee, betAsset };
}

export async function deployPredictionContractWithNativeBetUnit() {
  const [owner, admin, bettor1, bettor2] = await ethers.getSigners();

  const treasuryFee = BigInt(1000);

  const betAsset = {
    tokenType: 0, // NATIVE
    token: ethers.ZeroAddress,
    tokenId: 0,
    amount: ethers.parseUnits("0.01", 18), // 0.01 ETH
  };

  const PredictionContractFactory = await ethers.getContractFactory("Prediction");
  const prediction = await PredictionContractFactory.deploy(treasuryFee);

  return { prediction, owner, admin, bettor1, bettor2, treasuryFee, betAsset };
}
