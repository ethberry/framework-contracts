import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, solidityPacked, toBeHex, toBigInt, WeiPerEther, zeroPadValue } from "ethers";

export async function deployLinkVrfFixture() {
  const [owner] = await ethers.getSigners();
  // Deploy Chainlink & Vrf contracts
  const link = await ethers.getContractFactory("LinkToken");
  const linkInstance = await link.deploy();
  await linkInstance.waitForDeployment();
  // console.info(`LINK_ADDR=${linkInstance.address}`);
  const vrfFactory = await ethers.getContractFactory("VRFCoordinatorV2PlusMock");
  const vrfInstance = await vrfFactory.deploy(linkInstance);
  await vrfInstance.waitForDeployment();
  await vrfInstance.setLINKAndLINKNativeFeed(linkInstance, linkInstance);
  // GET CHAIN_LINK V2Plus TO WORK
  const tx = await vrfInstance.setConfig(
    3, // minimumRequestConfirmations
    1000000, // maxGasLimit
    1, // stalenessSeconds
    1, // gasAfterPaymentCalculation
    1, // fallbackWeiPerUnitLink
    1, // fulfillmentFlatFeeNativePPM
    1, // fulfillmentFlatFeeLinkDiscountPPM
    1, // nativePremiumPercentage
    1, // linkPremiumPercentage
  );
  await vrfInstance.createSubscription();
  const vrfEventFilter = vrfInstance.filters.SubscriptionCreated();
  const vrfEvents = await vrfInstance.queryFilter(vrfEventFilter);
  const subId = vrfEvents[0].args.subId;
  const subscriptionId = toBigInt(
    keccak256(
      solidityPacked(
        ["address", "bytes32", "address", "uint64"],
        [owner.address, tx.blockHash, await vrfInstance.getAddress(), 0],
      ),
    ),
  );
  expect(subId).to.equal(subscriptionId);

  const tx01 = linkInstance.transferAndCall(
    vrfInstance,
    WeiPerEther * 18n,
    zeroPadValue(toBeHex(subId.toString()), 32),
  );
  await expect(tx01)
    .to.emit(vrfInstance, "SubscriptionFunded")
    .withArgs(subId, 0, WeiPerEther * 18n);

  // console.info(`VRF_ADDR=${vrfInstance}`);
  return { linkInstance, vrfInstance, subId };
}
