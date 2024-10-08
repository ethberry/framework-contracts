import { task } from "hardhat/config";
import { toUtf8String } from "ethers";

task("decode", "Decode error message")
  .addParam("data", "encoded data")
  .setAction(async args => {
    const { data } = args;

    // dummy
    await Promise.resolve();

    // this works only with require
    console.info(toUtf8String(`0x${data.substring(138)}`));
  });
