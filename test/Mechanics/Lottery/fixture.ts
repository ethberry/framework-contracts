import { ethers } from "hardhat";

export async function deployLotteryRandomContract(): Promise<any> {
  const lotteryFactory = await ethers.getContractFactory("LotteryRandomHardhat");
  return lotteryFactory.deploy({
    timeLagBeforeRelease: 2592000, // 30 days
    commission: 30, // 30%
  });
}
