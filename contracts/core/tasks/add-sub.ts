import { task } from "hardhat/config";
import { Result } from "ethers";
import { VRFCoordinatorV2Mock } from "../typechain-types";
import { recursivelyDecodeResult } from "../test/utils";

task("add-sub", "Add vRF subscription").setAction(async (_, hre) => {
  // Get network information
  const block = await hre.ethers.provider.getBlock("latest");

  const networkName = hre.network.name;

  // set the VRF token contract address according to the environment
  let vrfContractAddr: string;
  switch (networkName) {
    case "rinkeby":
      vrfContractAddr = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
      break;
    case "binancetest":
      vrfContractAddr = "0x84b9b910527ad5c03a9ca831909e21e236ea7b06";
      break;
    case "mumbai":
      vrfContractAddr = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
      break;
    case "besu":
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
  const vrfTokenContract: VRFCoordinatorV2Mock = await hre.ethers.getContractAt(
    "VRFCoordinatorV2Mock",
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
