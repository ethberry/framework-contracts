import { ethers } from "hardhat";

import { blockAwait } from "@gemunion/contracts-helpers";
import { baseTokenURI, royalty, tokenName } from "@gemunion/contracts-constants";

export async function deployLottery(contracts: Record<string, any>) {
  const erc721LotteryFactory = await ethers.getContractFactory("ERC721Lottery");
  contracts.erc721Lottery = await erc721LotteryFactory.deploy("LOTTERY TICKET", "LOTT721", royalty, baseTokenURI);
  await blockAwait();

  const lotteryFactory = await ethers.getContractFactory("Lottery");
  contracts.lottery = await lotteryFactory.deploy(
    tokenName,
    contracts.erc721Lottery.address,
    contracts.erc20Simple.address,
  );
  await blockAwait();
}
