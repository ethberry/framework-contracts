import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { amount } from "@gemunion/contracts-constants";
import { blockAwait } from "@gemunion/contracts-helpers";
import { deployContract } from "@gemunion/contracts-mocks";

async function main() {
  const totalTransfers = 10n;

  const [_owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  await blockAwait();
  await blockAwait();

  const receivers = new Array(Number(totalTransfers)).fill(null).map(_ => receiver.address);
  const items = new Array(Number(totalTransfers)).fill(null).map(_ => ({
    tokenType: 0,
    token: ZeroAddress,
    tokenId: 0,
    amount,
  }));

  const tx = await contractInstance.disperse(items, receivers, { value: amount * totalTransfers });
  await blockAwait();

  console.info("TX HASH :::", tx?.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
