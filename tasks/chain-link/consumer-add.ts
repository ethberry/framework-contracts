import { task } from "hardhat/config";
import { Result } from "ethers";

import { recursivelyDecodeResult } from "@ethberry/utils-eth";

task("consumer-add", "Add vRF subscription")
  .addParam("vrf", "The VRF coordinator contract's address")
  .addParam("consumer", "The Consumer contract's address")
  .addParam("sub", "Subscription id, bigint")
  .setAction(async (args, hre) => {
    const { vrf, consumer, sub } = args;

    const blockNumber = await hre.ethers.provider.getBlockNumber();

    const vrfInstance = await hre.ethers.getContractAt(
      "VRFCoordinatorV2PlusMock",
      vrf
    );

    const tx = await vrfInstance.addConsumer(sub, consumer);
    await tx.wait();

    const eventFilter = vrfInstance.filters.SubscriptionConsumerAdded();
    const events = await vrfInstance.queryFilter(eventFilter, blockNumber);
    const result = recursivelyDecodeResult(events[0].args as unknown as Result);
    console.info("SubscriptionConsumerAdded", result);
  });

// hardhat consumer-add --vrf 0xa50a51c09a5c451C52BB714527E1974b686D8e77 --consumer 0xc515e8c2c5d9770fbb31db449afa4dbb0aa40b0d --sub 45315821488343670329473756257584680702070743240679789721238789166488578177127 --network ethberry_besu

// https://docs.chain.link/vrf/v2/subscription/supported-networks
