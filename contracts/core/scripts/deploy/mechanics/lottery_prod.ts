import { ethers } from "hardhat";
import { WeiPerEther } from "ethers";

import { blockAwait, blockAwaitMs } from "@gemunion/contracts-helpers";
import { baseTokenURI, royalty, tokenName } from "@gemunion/contracts-constants";

export async function deployLotteryProd(contracts: Record<string, any>) {
  const amount = WeiPerEther * 1_000_000n;
  const [owner] = await ethers.getSigners();
  const erc20SimpleFactory = await ethers.getContractFactory("ERC20Simple");
  const erc20SimpleInstance = await erc20SimpleFactory.deploy("Space Credits", "GEM20", amount);
  contracts.erc20Simple = erc20SimpleInstance;
  await blockAwaitMs(30000);
  await blockAwait();

  await erc20SimpleInstance.mint(owner.address, amount);
  await blockAwaitMs(30000);
  await blockAwait();
  await erc20SimpleInstance.approve(contracts.exchange.address, amount);
  await blockAwaitMs(30000);
  await blockAwait();

  const erc721LotteryFactory = await ethers.getContractFactory("ERC721Lottery");
  contracts.erc721Lottery = await erc721LotteryFactory.deploy("LOTTERY TICKET", "LOTT721", royalty, baseTokenURI);
  await blockAwaitMs(30000);
  await blockAwait();

  const lotteryFactory = await ethers.getContractFactory("Lottery");
  contracts.lottery = await lotteryFactory.deploy(
    tokenName,
    contracts.erc721Lottery.address,
    contracts.erc20Simple.address,
  );
  await blockAwaitMs(30000);
  await blockAwait();
}
