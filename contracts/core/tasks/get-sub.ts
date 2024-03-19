import { task } from "hardhat/config";
import { Result } from "ethers";
import { VRFCoordinatorV2Mock } from "../typechain-types";

export const recursivelyDecodeResult = (result: Result): Record<string, any> => {
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

task("get-sub", "Prints a VRF subscription data")
  .addParam("sub", "The Subscription ID")
  .setAction(async (args, hre) => {
    const { sub } = args;
    const networkName = hre.network.name;
    // console.log("networkName", networkName);
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

    const vrfTokenContract: VRFCoordinatorV2Mock = await hre.ethers.getContractAt(
      "VRFCoordinatorV2Mock",
      vrfContractAddr,
    );

    const data = await vrfTokenContract.getSubscription(sub);
    console.info("Subscription", recursivelyDecodeResult(data as unknown as Result));
  });
