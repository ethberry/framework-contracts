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
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
  const [owner, _receiver, _moneybag, stranger2] = await ethers.getSigners();
  const besuOwner = network.name === "besu" || network.name === "telos_test" ? owner : stranger2;
  console.info("besuOwner", besuOwner.address);
  const block = await ethers.provider.getBlock("latest");

  // LINK & VRF
  const linkAddr =
    network.name === "besu"
      ? "0x42699a7612a82f1d9c36148af9c77354759b210b"
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a" // vrf besu gemunion
        : network.name === "telos_test"
          ? "0x6eab1c5259173c4fea5667b4aad6529f4fc3176e" // telostest (our own contract deployed from p.key staging)
          : "0xb9a219631aed55ebc3d998f17c3840b7ec39c0cc"; // binance test

  const vrfAddr =
    network.name === "besu"
      ? "0xa50a51c09a5c451c52bb714527e1974b686d8e77" // vrf besu localhost
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x86c86939c631d53c6d812625bd6ccd5bf5beb774" // vrf besu gemunion
        : network.name === "telos_test"
          ? "0x33040c29f57f126b90d9528a5ee659d7a604b835" // telostest (our own contract deployed from p.key staging)
          : "0x4d2d24899c0b115a1fce8637fca610fe02f1909e"; // binance test

  const linkInstance = await ethers.getContractAt("LinkToken", linkAddr);
  console.info(`LINK_ADDR=${linkAddr}`);
  const vrfInstance = await ethers.getContractAt("VRFCoordinatorV2PlusMock", vrfAddr);
  console.info(`VRF_ADDR=${vrfAddr}`);

  // GET LINK TOKEN to OWNER
  if (besuOwner.address !== owner.address) {
    const linkAmount = WeiPerEther * 1000n;
    await debug(await linkInstance.connect(besuOwner).transfer(owner.address, linkAmount), "transfer1000LinkToOwner");
  }
  // GET ETH TOKEN to OWNER
  if (network.name !== "besu" && network.name !== "telos_test") {
    // SEND ETH to FW OWNER on gemunion besu only
    const ethAmount = WeiPerEther * 1000n;
    await debug(
      await _moneybag.sendTransaction({
        to: owner.address,
        value: ethAmount, // Sends exactly 1000.0 ether
      }),
      "fund 1000 ETH",
    );
  }

  // CREATE VRF SUBSCRIPTION
  await debug(await vrfInstance.connect(owner).createSubscription(), "createSubscription");

  // GET new SUB ID
  const eventFilter = vrfInstance.filters.SubscriptionCreated();
  const events = await vrfInstance.queryFilter(eventFilter, block!.number);
  const { subId } = recursivelyDecodeResult(events[events.length - 1].args as unknown as Result);
  console.info("SubscriptionCreated", subId);

  // FUND SUBSCRIPTION
  const subscriptionId = zeroPadValue(toBeHex(subId), 32);
  await debug(
    await linkInstance.transferAndCall(await vrfInstance.getAddress(), WeiPerEther * 100n, subscriptionId),
    "transferAndCall 100 LINK",
  );

  const eventFilter1 = vrfInstance.filters.SubscriptionFunded();
  const events1 = await vrfInstance.queryFilter(eventFilter1, block!.number);
  const { newBalance } = recursivelyDecodeResult(events1[events1.length - 1].args as unknown as Result);
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
