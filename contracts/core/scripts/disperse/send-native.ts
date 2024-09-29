import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@ethberry/contracts-constants";
import { blockAwait } from "@ethberry/contracts-helpers";
import { deployContract } from "@ethberry/contracts-utils";

async function main() {
  const totalTransfers = 10n;

  const [_owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  await blockAwait();
  await blockAwait();

  const receivers = new Array(Number(totalTransfers)).fill(null).map(_ => receiver.address);
  const items = receivers.map(_ => ({
    tokenType: 0, // NATIVE
    token: ZeroAddress,
    tokenId: 0,
    amount,
  }));

  const tx = await contractInstance.disperse(items, receivers, { value: amount * totalTransfers });
  await blockAwait();

  console.info("TX HASH :::", tx?.hash);
}

main().catch(error => {
  console.error(error);
});
