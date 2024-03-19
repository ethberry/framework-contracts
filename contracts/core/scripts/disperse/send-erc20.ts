import { ethers } from "hardhat";

import { deployContract } from "@gemunion/contracts-mocks";
import { amount } from "@gemunion/contracts-constants";

import { deployERC20 } from "../../test/ERC20/shared/fixtures";

async function main() {
  const totalTransfers = 10n;

  const [owner, receiver] = await ethers.getSigners();
  const contractInstance = await deployContract("Dispenser");
  const erc20Instance = await deployERC20();

  await erc20Instance.mint(owner.address, amount * totalTransfers);
  await erc20Instance.approve(await contractInstance.getAddress(), amount);

  const receivers = new Array(Number(totalTransfers)).fill(null).map(_ => receiver.address);
  const items = await Promise.all(
    new Array(Number(totalTransfers)).fill(null).map(async _ => ({
      tokenType: 0,
      token: await erc20Instance.getAddress(),
      tokenId: 0,
      amount,
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
