import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "hardhat";
import { deployERC20 } from "../ERC20/shared/fixtures";

export async function deployVRFCoordinator(): Promise<{
  erc20Instance: any;
  vrfInstance: any;
}> {
  const factory = await ethers.getContractFactory("GemVRFCoordinatorV2");

  //   const erc20Instance = await deployUsdt();
  const erc20Instance = await deployERC20();
  const usdtAddr = await erc20Instance.getAddress();

  const vrfInstance = await factory.deploy(usdtAddr, usdtAddr, usdtAddr);

  return {
    erc20Instance,
    vrfInstance,
  };
}
