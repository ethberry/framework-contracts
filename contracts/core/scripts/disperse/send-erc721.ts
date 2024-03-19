import { ethers } from "hardhat";

import { deployContract } from "@gemunion/contracts-mocks";

import { deployCollection } from "../../test/Mechanics/Collection/shared/fixtures";

async function main() {
  const totalTransfers = 3;

  const [_owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  const erc721Instance = await deployCollection();

  await erc721Instance.setApprovalForAll(await contractInstance.getAddress(), true);

  const receivers = new Array(Number(totalTransfers)).fill(null).map(_ => receiver.address);
  const items = await Promise.all(
    new Array(Number(totalTransfers)).fill(null).map(async (_, i) => ({
      tokenType: 0,
      token: await erc721Instance.getAddress(),
      tokenId: i + 1,
      amount: 1,
    })),
  );

  const tx = await contractInstance.disperse(items, receivers, {
    gasLimit: 10000000,
  });

  console.info("TX HASH :::", tx?.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
