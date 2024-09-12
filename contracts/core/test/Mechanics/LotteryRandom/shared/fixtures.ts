import { ethers } from "hardhat";
import { Contract } from "ethers";

export async function deployLotteryRandomContract(): Promise<Contract> {
  const LotteryRandom = await ethers.getContractFactory("LotteryRandomHardhat");
  const config = {
    timeLagBeforeRelease: 2592000, // 30 days
    commission: 30, // 30%
  };
  const lottery = await LotteryRandom.deploy(config);
  return lottery;
}
