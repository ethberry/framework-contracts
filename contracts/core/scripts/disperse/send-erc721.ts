import { ethers } from "hardhat";

import { deployContract } from "@gemunion/contracts-utils";

import { deployCollection } from "../../test/Mechanics/Collection/shared/fixtures";

async function main() {
  const totalTransfers = 10n;

  const [_owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  const erc721Instance = await deployCollection();

  await erc721Instance.setApprovalForAll(contractInstance, true);

  const receivers = new Array(Number(totalTransfers)).fill(null).map(_ => receiver.address);
  const items = await Promise.all(
    receivers.map((_, i) => ({
      tokenType: 2, // ERC721
      token: erc721Instance,
      tokenId: i + 1,
      amount: 1,
    })),
  );

  const tx = await contractInstance.disperse(items, receivers, {
    gasLimit: 10000000,
  });

  console.info("TX HASH :::", tx?.hash);
}

main().catch(error => {
  console.error(error);
});
