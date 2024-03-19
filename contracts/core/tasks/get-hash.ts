import { task } from "hardhat/config";
import { keccak256, toUtf8Bytes } from "ethers";

task("get-hash", "Prints an keccak hash")
  .addParam("key", "The account's address")
  .setAction(async (args, hre) => {
    const { key } = args;

    await hre.ethers.getContractFactory("ERC20ACBCS");
    // const coinInstance = coinFactory.attach(contract);
    // const accBalance = await coinInstance.balanceOf(account);

    const labelhash = keccak256(toUtf8Bytes(key));

    console.info("hash:", labelhash);
  });
