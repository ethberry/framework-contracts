import { ethers, network } from "hardhat";
import { Contract, Result, toBeHex, TransactionReceipt, TransactionResponse, WeiPerEther, zeroPadValue } from "ethers";
import { blockAwait, blockAwaitMs, camelToSnakeCase } from "@gemunion/contracts-helpers";
import { recursivelyDecodeResult } from "../../utis/decoder";

const delay = 2; // block delay
const delayMs = 1000; // block delay ms
// const subscriptionId = 1; // besu
// const subscriptionId = 2; // gemunion

interface IObj {
  address?: string;
  hash?: string;
  wait: () => Promise<TransactionReceipt> | void;
}

const debug = async (obj: IObj | Record<string, Contract> | TransactionResponse, name?: string) => {
  if (obj?.hash) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/restrict-template-expressions
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
  const [owner, _receiver, moneybag, _stranger2] = await ethers.getSigners();
  const besuOwner = network.name === "gemunion_besu" ? owner : _stranger2;
  // const besuOwner = owner;
  console.info("besuOwner", besuOwner.address);
  console.info("owner", owner.address);
  const block = await ethers.provider.getBlock("latest");
  // LINK & VRF
  // LINK_ADDR=0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a
  // VRF_ADDR=0x86c86939c631d53c6d812625bd6ccd5bf5beb774

  const linkAddr =
    network.name === "gemunion_besu"
      ? "0x42699a7612a82f1d9c36148af9c77354759b210b"
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a" // vrf besu gemunion
        : "0xb9a219631aed55ebc3d998f17c3840b7ec39c0cc"; // binance test

  const vrfAddr =
    network.name === "gemunion_besu"
      ? "0xa50a51c09a5c451c52bb714527e1974b686d8e77" // vrf besu localhost
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x86c86939c631d53c6d812625bd6ccd5bf5beb774" // vrf besu gemunion
        : "0x4d2d24899c0b115a1fce8637fca610fe02f1909e"; // binance test

  const vrfInstance: any = await ethers.getContractAt("VRFCoordinatorV2PlusMock", vrfAddr);
  const linkInstance = await ethers.getContractAt("LinkToken", linkAddr);
  console.info(`LINK_ADDR=${linkAddr}`);
  console.info(`VRF_ADDR=${vrfAddr}`);

  if (network.name !== "gemunion_besu") {
    // SEND ETH to FW OWNER on gemunion besu only
    const ethAmount = WeiPerEther * 1000n;
    await debug(
      await moneybag.sendTransaction({
        to: owner.address,
        value: ethAmount, // Sends exactly 1000.0 ether
      }),
      "fund 1000 ETH",
    );
  }

  // GET LINK TOKEN to OWNER
  if (besuOwner.address !== owner.address) {
    const linkAmount = WeiPerEther * 1000n;
    await debug(await linkInstance.connect(besuOwner).transfer(owner.address, linkAmount), "transfer1000LinkToOwner");
  }

  // CREATE VRF SUBSCRIPTION
  await debug(await vrfInstance.connect(owner).createSubscription(), "createSubscription");

  // GET new SUB ID
  const eventFilter = vrfInstance.filters.SubscriptionCreated();
  const events = await vrfInstance.queryFilter(eventFilter, block!.number);
  const { subId } = recursivelyDecodeResult(events[events.length - 1].args as unknown as Result);
  console.info("SubscriptionCreated", subId);

  const linkAmount = WeiPerEther * 1000n;
  await debug(await linkInstance.connect(besuOwner).transfer(owner.address, linkAmount), "transfer1000LinkToOwner");

  // FUND SUBSCRIPTION
  await debug(
    await linkInstance.transferAndCall(vrfAddr, WeiPerEther * 10n, zeroPadValue(toBeHex(subId.toString()), 32)),
    "transferAndCall 100 LINK",
  );
}

main()
  .then(async () => {
    for (const [key, value] of Object.entries(contracts)) {
      console.info(`${camelToSnakeCase(key).toUpperCase()}_ADDR=${(await value.getAddress()).toLowerCase()}`);
    }
  })
  .catch(error => {
    console.error(error);
  });
