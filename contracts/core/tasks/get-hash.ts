import { task } from "hardhat/config";
import { keccak256, toUtf8Bytes } from "ethers";

task("get-hash", "Prints an keccak hash")
  .addParam("key", "The account's address")
  .setAction(async (args, hre) => {
    const { key } = args;

    console.info("hash:", keccak256(toUtf8Bytes(key)));
  });
