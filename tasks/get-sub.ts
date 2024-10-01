import { task } from "hardhat/config";
import { Result } from "ethers";

import { recursivelyDecodeResult } from "@ethberry/utils-eth";

import { VRFCoordinatorV2PlusMock } from "../contracts/core";

task("get-sub", "Prints a VRF subscription data")
  .addParam("sub", "The Subscription ID")
  .setAction(async (args, hre) => {
    const { sub } = args;
    const networkName = hre.network.name;
    // console.log("networkName", networkName);
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
      default:
        throw new Error(`Unsupported network ${networkName}`);
    }

    const vrfTokenContract: VRFCoordinatorV2PlusMock = await hre.ethers.getContractAt(
      "VRFCoordinatorV2PlusMock",
      vrfContractAddr,
    );

    const data = await vrfTokenContract.getSubscription(sub);
    console.info("Subscription", recursivelyDecodeResult(data as unknown as Result));
  });

// hardhat get-sub --sub 107047671614105181605855861266364170459723373514078878123604030694679782559997 --network gemunion
