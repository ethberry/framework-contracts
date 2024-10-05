import { task } from "hardhat/config";
import { Result } from "ethers";

import { recursivelyDecodeResult } from "@ethberry/utils-eth";


task("sub-create", "Add VRF subscription")
  .addParam("contract", "The VRF coordinator contract's address")
  .setAction(async (args, hre) => {
    const { vrf } = args;

    const blockNumber = await hre.ethers.provider.getBlockNumber();

    const vrfInstance = await hre.ethers.getContractAt(
      "VRFCoordinatorV2PlusMock",
      vrf
    );

    const tx = await vrfInstance.createSubscription();
    await tx.wait();

    const eventFilter = vrfInstance.filters.SubscriptionCreated();
    const events = await vrfInstance.queryFilter(eventFilter, blockNumber);
    const result = recursivelyDecodeResult(events[0].args as unknown as Result);
    console.info("SubscriptionCreated", result);
  });

// hardhat sub-create --vrf 0xa50a51c09a5c451C52BB714527E1974b686D8e77 --network ethberry_besu

// ethereum         0xD7f86b4b8Cae7D942340FF628F82735b7a20893a
// ethereum_sepolia 0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B
// binance          0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9
// binance_test     0xDA3b641D438362C440Ac5458c57e00a712b66700
// polygon          0xec0Ed46f36576541C75739E915ADbCb3DE24bD77
// polygon_amoy     0x343300b5d84D444B2ADc9116FEF1bED02BE49Cf2

// https://docs.chain.link/vrf/v2/subscription/supported-networks
