import { expect } from "chai";
import { ethers } from "hardhat";
import { toBeHex, WeiPerEther, zeroPadValue } from "ethers";

export async function deployLinkVrfFixture() {
  // Deploy Chainlink & Vrf contracts
  const link = await ethers.getContractFactory("LinkToken");
  const linkInstance = await link.deploy();
  await linkInstance.waitForDeployment();
  // console.info(`LINK_ADDR=${linkInstance.address}`);
  const vrfFactory = await ethers.getContractFactory("VRFCoordinatorV2Mock");
  const vrfInstance = await vrfFactory.deploy(await linkInstance.getAddress());
  await vrfInstance.waitForDeployment();
  // GET CHAIN_LINK V2 TO WORK
  await vrfInstance.setConfig(3, 1000000, 1, 1, 1);
  await vrfInstance.createSubscription();
  const vrfEventFilter = vrfInstance.filters.SubscriptionCreated();
  const vrfEvents = await vrfInstance.queryFilter(vrfEventFilter);
  const subsriptionId = vrfEvents[0].args.subId;
  expect(subsriptionId).to.equal(1);

  const tx01 = linkInstance.transferAndCall(
    await vrfInstance.getAddress(),
    WeiPerEther * 18n,
    zeroPadValue(toBeHex(subsriptionId.toString()), 32),
  );
  await expect(tx01)
    .to.emit(vrfInstance, "SubscriptionFunded")
    .withArgs(subsriptionId, 0, WeiPerEther * 18n);

  // console.info(`VRF_ADDR=${await vrfInstance.getAddress()}`);
  return { linkInstance, vrfInstance };
}
