import { task } from "hardhat/config";
import { toUtf8String } from "ethers";

task("decode", "Decode error message")
  .addParam("data", "encoded data")
  .setAction(async args => {
    const { data } = args;

    // dummy
    await Promise.resolve();

    console.info(toUtf8String(`0x${data.substr(138)}`));
  });
