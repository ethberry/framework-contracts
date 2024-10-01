import { ethers } from "hardhat";

import { amount } from "@ethberry/contracts-constants";
import { deployContract } from "@ethberry/contracts-utils";

import { tokenId } from "../../test/constants";
import { deployERC1155 } from "../../test/ERC1155/shared/fixtures";

async function main() {
  const totalTransfers = 10n;

  const [owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  const erc1155Instance = await deployERC1155();

  await erc1155Instance.mint(owner.address, tokenId, amount * totalTransfers, "0x");
  await erc1155Instance.setApprovalForAll(contractInstance, true);

  const receivers = new Array(Number(totalTransfers)).fill(receiver.address);
  const items = await Promise.all(
    receivers.map(_ => ({
      tokenType: 4, // ERC1155
      token: erc1155Instance,
      tokenId,
      amount,
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
