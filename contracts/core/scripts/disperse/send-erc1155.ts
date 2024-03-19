import { ethers } from "hardhat";

import { amount } from "@gemunion/contracts-constants";
import { deployContract } from "@gemunion/contracts-mocks";

import { tokenId } from "../../test/constants";
import { deployERC1155 } from "../../test/ERC1155/shared/fixtures";

async function main() {
  const totalTransfers = 10n;

  const [owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  const erc1155Instance = await deployERC1155();

  await erc1155Instance.mint(owner.address, tokenId, amount * totalTransfers, "0x");
  await erc1155Instance.setApprovalForAll(await contractInstance.getAddress(), true);

  const receivers = new Array(Number(totalTransfers)).fill(receiver.address);
  const items = await Promise.all(
    new Array(Number(totalTransfers)).fill(null).map(async _ => ({
      tokenType: 0,
      token: await erc1155Instance.getAddress(),
      tokenId,
      amount,
    })),
  );

  const tx = await contractInstance.disperse(items, receivers, {
    gasLimit: 100000000,
  });

  console.info("TX HASH :::", tx?.hash);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
