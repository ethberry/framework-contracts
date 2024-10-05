import { task } from "hardhat/config";
import { Result } from "ethers";

import { recursivelyDecodeResult } from "@ethberry/utils-eth";

task("consumer-rem", "Add vRF subscription")
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

    const tx = await vrfInstance.removeConsumer(sub, consumer);
    await tx.wait();

    const eventFilter = vrfInstance.filters.SubscriptionConsumerRemoved();
    const events = await vrfInstance.queryFilter(eventFilter, blockNumber);
    const result = recursivelyDecodeResult(events[0].args as unknown as Result);
    console.info("SubscriptionConsumerAdded", result);
  });

// hardhat consumer-rem --vrf 0xa50a51c09a5c451C52BB714527E1974b686D8e77 --consumer 0xD6470D46e2062c4E428375e2D21a0e549B104f3B --sub 26054867937820587328159301681415153712869728729402639383884357844206994385379 --network ethberry_besu

// ethereum         0xD7f86b4b8Cae7D942340FF628F82735b7a20893a
// ethereum_sepolia 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
// binance          0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9
// binance_test     0xDA3b641D438362C440Ac5458c57e00a712b66700
// polygon          0xec0Ed46f36576541C75739E915ADbCb3DE24bD77
// polygon_amoy     0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2

// https://docs.chain.link/vrf/v2/subscription/supported-networks
