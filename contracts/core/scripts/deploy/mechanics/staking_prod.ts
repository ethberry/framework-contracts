import { ethers } from "hardhat";
import { WeiPerEther, ZeroAddress } from "ethers";

import { blockAwait } from "@gemunion/contracts-helpers";
import { MINTER_ROLE } from "@gemunion/contracts-constants";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deployStakingProd(contracts: Record<string, any>) {
  const stakingFactory = await ethers.getContractFactory("Staking");
  const stakingInstance = await stakingFactory.deploy(10);
  await delay(15000);
  await blockAwait(1);

  contracts.staking = stakingInstance;
  await delay(15000);

  await stakingInstance.setRules([
    {
      externalId: 1, // NATIVE > NATIVE
      deposit: {
        tokenType: 0,
        token: ZeroAddress,
        tokenId: 0,
        amount: WeiPerEther,
      },
      reward: {
        tokenType: 0,
        token: ZeroAddress,
        tokenId: 0,
        amount: WeiPerEther.div(100).mul(5), // 5%
      },
      content: [],
      period: 30 * 84600,
      penalty: 1,
      recurrent: false,
      active: true,
    },
  ]);
  await delay(15000);
  await blockAwait(1);
  await delay(15000);

  await contracts.contractManager.addFactory(await stakingInstance.getAddress(), MINTER_ROLE);
  await delay(15000);
  await blockAwait(1);
}
