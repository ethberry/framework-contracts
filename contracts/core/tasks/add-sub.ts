import { task } from "hardhat/config";
import { Result } from "ethers";

import { recursivelyDecodeResult } from "@ethberry/utils-eth";

import { VRFCoordinatorV2PlusMock } from "../typechain-types";

task("add-sub", "Add vRF subscription").setAction(async (_, hre) => {
  // Get network information
  const block = await hre.ethers.provider.getBlock("latest");

  const networkName = hre.network.name;

  // set the VRF token contract address according to the environment
  let vrfContractAddr: string;
  switch (networkName) {
    case "binance_test":
      vrfContractAddr = "0x84b9b910527ad5c03a9ca831909e21e236ea7b06";
      break;
    case "polygon_amoy":
      vrfContractAddr = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
      break;
    case "gemunion_besu":
      vrfContractAddr = "0xa50a51c09a5c451c52bb714527e1974b686d8e77";
      break;
    case "gemunion":
      vrfContractAddr = "0x86c86939c631d53c6d812625bd6ccd5bf5beb774";
      break;
    case "gemunionprod":
      vrfContractAddr = "0x86c86939c631d53c6d812625bd6ccd5bf5beb774";
      break;
    default:
      // default to besu
      vrfContractAddr = "0xa50a51c09a5c451c52bb714527e1974b686d8e77";
  }

  // Create connection to LINK token contract and initiate the transfer
  // const vrfTokenContract = new hre.ethers.Contract(vrfContractAddr, LINK_TOKEN_ABI, owner);
  const vrfTokenContract: VRFCoordinatorV2PlusMock = await hre.ethers.getContractAt(
    "VRFCoordinatorV2PlusMock",
    vrfContractAddr,
  );
  // TODO doesnt work this way with events
  // An unexpected error occurred: TypeError: Cannot read properties of undefined (reading 'args')

  await vrfTokenContract.createSubscription().then(async function (transaction: any) {
    // GET SUB ID
    const eventFilter = vrfTokenContract.filters.SubscriptionCreated();
    const events = await vrfTokenContract.queryFilter(eventFilter, block!.number);
    const { subId } = recursivelyDecodeResult(events[0].args as unknown as Result);
    console.info("SubscriptionCreated", subId);
    console.info("Subscription", subId, "created", " Transaction Hash: ", transaction.hash);
  });
});

module.exports = {};
