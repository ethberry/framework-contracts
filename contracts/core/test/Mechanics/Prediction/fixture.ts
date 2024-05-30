import "@nomicfoundation/hardhat-toolbox";

import { ethers, network } from "hardhat";
import { parseEther } from "ethers";

import { getContractName } from "../../utils";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { deployERC20 } from "../../ERC20/shared/fixtures";
import { wrapLotterySignature } from "./utils";

interface IPredictionConfig {
  // timeLagBeforeRelease: number;
  commission: number;
}

export async function deployPrediction(config: IPredictionConfig): Promise<{
  erc20Instance: any;
  predictionInstance: any;
  generateSignature: any;
}> {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("PredictionSimple");

  const erc20Instance: any = await deployERC20("ERC20Simple", { amount: parseEther("200000") });

  const predictionInstance: any = await factory.deploy(config);

  return {
    erc20Instance,
    predictionInstance,
    generateSignature: wrapLotterySignature(await ethers.provider.getNetwork(), predictionInstance, owner),
  };
}
