import "@nomicfoundation/hardhat-toolbox";

import { ethers } from "hardhat";

export async function deployPaymentSplitter(): Promise<any> {
  const [owner] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("PaymentSplitter");
  return factory.deploy([owner.address], [100]);
}
