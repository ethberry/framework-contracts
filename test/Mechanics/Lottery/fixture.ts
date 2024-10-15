import { ethers } from "hardhat";

export async function deployLotteryContract(): Promise<any> {
  const lotteryFactory = await ethers.getContractFactory("LotteryHardhat");
  return lotteryFactory.deploy({
    timeLagBeforeRelease: 2592000, // 30 days
    commission: 30, // 30%
  });
}
