import { ethers } from "hardhat";
import { deployERC1363 } from "../../../ERC20/shared/fixtures";
import { amountWei, tokenZero, cap } from "../../../constants.ts";
import { treasuryFee } from "./utils";

export async function deployPredictionContract() {
  const PredictionContractFactory = await ethers.getContractFactory("Prediction");
  const predictionInstance = await PredictionContractFactory.deploy(treasuryFee);

  return predictionInstance;
}

export async function deployTokenAsBetAsset() {
  const token = await deployERC1363("ERC20Simple", { amount: cap });

  const betAsset = {
    tokenType: 1,
    token: token.target,
    tokenId: 0,
    amount: amountWei,
  };

  return betAsset;
}

export function getNativeBetAsset() {
  const betAsset = {
    tokenType: 0,
    token: tokenZero,
    tokenId: 0,
    amount: amountWei,
  };

  return betAsset;
}
