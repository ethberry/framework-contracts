import { task } from "hardhat/config";
import { WeiPerEther } from "ethers";

task("transfer-native", "Prints an ETH balance")
  .addParam("to", "The account's address")
  .addOptionalParam("value", "Amount to send")
  .setAction(async (args, hre) => {
    const { to, value = 1_000_000n } = args;

    const [owner] = await hre.ethers.getSigners();

    const tx = await owner.sendTransaction({
      to,
      value: BigInt(value) * WeiPerEther,
    });
    await tx.wait();

    console.info("DONE");
  });

// hardhat transfer-native --to 0xe99289c8b909d94d7f0cc9435e18d7157dc7da25 --value 10 --network ethberry_besu
