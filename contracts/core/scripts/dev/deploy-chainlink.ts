import { ethers, network } from "hardhat";
import { Contract, Result, toBeHex, TransactionReceipt, TransactionResponse, WeiPerEther, zeroPadValue } from "ethers";

import { blockAwait, blockAwaitMs, camelToSnakeCase } from "@gemunion/contracts-helpers";

const delay = 2; // block delay
const delayMs = 1000; // block delay ms
// const subscriptionId = 1; // besu
// const subscriptionId = 2; // gemunion

interface IObj {
  address?: string;
  hash?: string;
  wait: () => Promise<TransactionReceipt> | void;
}

const recursivelyDecodeResult = (result: Result): Record<string, any> => {
  if (typeof result !== "object") {
    // Raw primitive value
    return result;
  }
  try {
    const obj = result.toObject();
    if (obj._) {
      throw new Error("Decode as array, not object");
    }
    Object.keys(obj).forEach(key => {
      obj[key] = recursivelyDecodeResult(obj[key]);
    });
    return obj;
  } catch (err) {
    // Result is array.
    return result.toArray().map(item => recursivelyDecodeResult(item as Result));
  }
};

const debug = async (obj: IObj | Record<string, Contract> | TransactionResponse, name?: string) => {
  if (obj && obj.hash) {
    console.info(`${name} tx: ${obj.hash}`);
    await blockAwaitMs(delayMs);
    const transaction: TransactionResponse = obj as TransactionResponse;
    await transaction.wait();
  } else {
    console.info(`${Object.keys(obj).pop()} deployed`);
    await blockAwait(delay, delayMs);
  }
};

const contracts: Record<string, any> = {};

async function main() {
  const block = await ethers.provider.getBlock("latest");

  // LINK & VRF
  const linkAddr =
    network.name === "besu"
      ? "0x42699a7612a82f1d9c36148af9c77354759b210b"
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a"
        : "0x42699A7612A82f1d9C36148af9C77354759b210b";

  const vrfAddr =
    network.name === "besu"
      ? "0xa50a51c09a5c451c52bb714527e1974b686d8e77" // vrf besu localhost
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x86c86939c631d53c6d812625bd6ccd5bf5beb774" // vrf besu gemunion
        : "0xa50a51c09a5c451c52bb714527e1974b686d8e77";

  const linkFactory = await ethers.getContractFactory("LinkToken");
  // const linkInstance = linkFactory.attach(linkAddr);
  const linkInstance = await linkFactory.deploy();
  contracts.link = linkInstance;
  const linkAddress = await contracts.link.getAddress();
  await debug(contracts);
  console.info(`LINK_ADDR=${linkAddress}`);
  const vrfFactory = await ethers.getContractFactory("VRFCoordinatorV2PlusMock");
  const vrfInstance = await vrfFactory.deploy(linkAddress);

  // const vrfInstance = vrfFactory.attach(vrfAddr);
  contracts.vrf = vrfInstance;
  const vrfAddress = await contracts.vrf.getAddress();
  await debug(contracts);
  console.info(`VRF_ADDR=${vrfAddress}`);

  if (linkAddress.toLowerCase() !== linkAddr) {
    console.info("LINK_ADDR address mismatch, clean BESU, then try again");
  }
  if (vrfAddress.toLowerCase() !== vrfAddr) {
    console.info("VRF_ADDR address mismatch, clean BESU, then try again");
  }
  // BESU gemunion
  // address(0x86C86939c631D53c6D812625bD6Ccd5Bf5BEb774), // vrfCoordinator
  //   address(0x1fa66727cDD4e3e4a6debE4adF84985873F6cd8a), // LINK token
  // SETUP CHAIN_LINK VRF-V2 TO WORK
  const linkAmount = WeiPerEther * 1000n;
  process.exit(0);
  /**
   * @notice Sets the configuration of the vrfv2 coordinator
   * @param minimumRequestConfirmations global min for request confirmations
   * @param maxGasLimit global max for request gas limit
   * @param stalenessSeconds if the eth/link feed is more stale then this, use the fallback price
   * @param gasAfterPaymentCalculation gas used in doing accounting after completing the gas measurement
   * @param fallbackWeiPerUnitLink fallback eth/link price in the case of a stale feed
   */

  await debug(await vrfInstance.setConfig(3, 1000000, 1, 1, 1), "setConfig");
  await debug(await vrfInstance.createSubscription(), "createSubscription");
  // emit SubscriptionCreated(currentSubId, msg.sender);
  const eventFilter = vrfInstance.filters.SubscriptionCreated();
  const events = await vrfInstance.queryFilter(eventFilter, block!.number);
  const { subId } = recursivelyDecodeResult(events[0].args as unknown as Result);
  console.info("SubscriptionCreated", subId);

  const subscriptionId = zeroPadValue(toBeHex(subId), 32);
  await debug(
    await linkInstance.transferAndCall(await vrfInstance.getAddress(), linkAmount, subscriptionId),
    "transferAndCall",
  );
  // const linkInstance = link.attach("0xa50a51c09a5c451C52BB714527E1974b686D8e77"); // localhost BESU
  const eventFilter1 = vrfInstance.filters.SubscriptionFunded();
  const events1 = await vrfInstance.queryFilter(eventFilter1, block!.number);
  const { newBalance } = recursivelyDecodeResult(events1[0].args as unknown as Result);
  console.info("SubscriptionFunded", newBalance);

  const subs = await vrfInstance.getSubscription(subId);
  console.info("Subscription", recursivelyDecodeResult(subs as unknown as Result));
}

main()
  .then(async () => {
    for (const [key, value] of Object.entries(contracts)) {
      console.info(`${camelToSnakeCase(key).toUpperCase()}_ADDR=${(await value.getAddress()).toLowerCase()}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
