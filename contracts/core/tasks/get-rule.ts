import { task } from "hardhat/config";
import { Result } from "ethers";
import { Staking } from "../typechain-types";

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

task("get-rule", "Prints a Staking rule")
  .addParam("staking", "The Staking address")
  .addParam("rule", "The Staking rule ID")
  .setAction(async (args, hre) => {
    const { staking, rule } = args;

    const stakingContract: Staking = await hre.ethers.getContractAt("Staking", staking);

    const data = await stakingContract.getRule(rule);
    console.info("Staking rule:", recursivelyDecodeResult(data as unknown as Result));
  });

// hardhat get-rule --network besu --staking 0x5798cf2507399e4b45fb9d2fbb255299e0070294 --rule 4
