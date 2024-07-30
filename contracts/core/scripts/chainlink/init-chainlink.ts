import { ethers, network } from "hardhat";
import { Contract, TransactionReceipt, TransactionResponse, WeiPerEther } from "ethers";

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
  const [owner, _receiver, moneybag, _stranger2] = await ethers.getSigners();
  // const besuOwner = network.name === "besu" ? owner : stranger2;
  const besuOwner = owner;
  console.info("besuOwner", besuOwner.address);
  // LINK & VRF
  // LINK_ADDR=0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a
  // VRF_ADDR=0x86c86939c631d53c6d812625bd6ccd5bf5beb774

  const linkAddr =
    network.name === "besu"
      ? "0x42699a7612a82f1d9c36148af9c77354759b210b"
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x1fa66727cdd4e3e4a6debe4adf84985873f6cd8a" // vrf besu gemunion
        : "0xb9a219631aed55ebc3d998f17c3840b7ec39c0cc"; // binance test

  const vrfAddr =
    network.name === "besu"
      ? "0xa50a51c09a5c451c52bb714527e1974b686d8e77" // vrf besu localhost
      : network.name === "gemunion" || network.name === "gemunionprod"
        ? "0x86c86939c631d53c6d812625bd6ccd5bf5beb774" // vrf besu gemunion
        : "0x4d2d24899c0b115a1fce8637fca610fe02f1909e"; // binance test

  const linkFactory = await ethers.getContractFactory("LinkToken");
  contracts.link = await linkFactory.connect(besuOwner).deploy();
  const linkAddress = await contracts.link.getAddress();
  await debug(contracts);
  console.info(`LINK_ADDR=${linkAddress}`);
  const vrfFactory = await ethers.getContractFactory("VRFCoordinatorV2PlusMock");
  const vrfInstance = await vrfFactory.connect(besuOwner).deploy(linkAddress);
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

  // SETUP CHAIN_LINK VRF-V2 TO WORK

  /**
   * @notice Sets the configuration of the vrfv2 coordinator
   * @param minimumRequestConfirmations global min for request confirmations
   * @param maxGasLimit global max for request gas limit
   * @param stalenessSeconds if the eth/link feed is more stale then this, use the fallback price
   * @param gasAfterPaymentCalculation gas used in doing accounting after completing the gas measurement
   * @param fallbackWeiPerUnitLink fallback eth/link price in the case of a stale feed
   */
  await debug(await vrfInstance.connect(besuOwner).setConfig(3, 1000000, 1, 1, 1), "setConfig");

  if (network.name !== "besu" && network.name !== "telos_test" && network.name !== "manta_test") {
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
