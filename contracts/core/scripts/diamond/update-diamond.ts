import { ethers } from "hardhat";
import fs from "fs";
import { camelToSnakeCase } from "@gemunion/contracts-helpers";
import { debug } from "../utils/deploy-utils";
import { addFacetDiamond, deployDiamond, updateFacetDiamond, removeFacetDiamond } from "../../test/Exchange/shared";

const currentBlock: { number: number } = { number: 1 };
const contracts: Record<string, any> = {};

async function main() {
  const block = await ethers.provider.getBlock("latest");
  currentBlock.number = block!.number;
  fs.appendFileSync(`${process.cwd()}/log.txt`, `STARTING_BLOCK=${currentBlock.number}\n`);

  // CM DIAMOND
  const instance = await ethers.getContractAt("DiamondExchange", "0xda03570d4185155ac2e5b4e17aa016e2fd485a58");
  const cmAddress = await instance.getAddress();

  // // UPDATE DIAMOND EXCHANGE (ADD FACET) !!!
  await addFacetDiamond(
    "DiamondExchange",
    cmAddress,
    [
      "ExchangeClaimFacet",
      "ExchangeCraftFacet",
      "ExchangeDismantleFacet",
      "ExchangeGradeFacet",
      "ExchangeLootBoxFacet",
      "ExchangeLotteryFacet",
      "ExchangeMergeFacet",
      "ExchangeMockFacet",
      "ExchangeMysteryBoxFacet",
      "ExchangePurchaseFacet",
      "ExchangeRaffleFacet",
      "ExchangeRentableFacet",
    ],
    {
      log: true,
      logSelectors: true,
    },
  );

  // TODO check diamondLoupe existence
  const diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", cmAddress);
  const result = await diamondLoupeFacet.facetAddresses();
  console.info("DiamondFacetAddresses:", result);

  // DIAMOND EXCHANGE DEPLOY (INIT)
  const exchangeInstance = await deployDiamond("DiamondExchange", ["ExchangeClaimFacet"], "DiamondExchangeInit", {
    log: true,
    logSelectors: true,
  });
  contracts.exchange = exchangeInstance;
  await debug(contracts);

  // BESU DEV
  const exchangeAddr = await exchangeInstance.getAddress();
  // BSC STAGE
  // const exchangeAddr = "0x5fee6631bfa86057c5878ea170564b67774e1fe8";

  // UPDATE DIAMOND EXCHANGE (ADD FACET) !!!
  await addFacetDiamond("DiamondExchange", exchangeAddr, ["DiamondLoupeFacet"], {
    log: true,
    logSelectors: true,
  });

  // UPDATE DIAMOND EXCHANGE (REPLACE FACET)
  await updateFacetDiamond("DiamondExchange", exchangeAddr, ["ExchangeClaimFacet"], {
    log: true,
    logSelectors: true,
  });

  // REMOVE DIAMOND FACET (REMOVE)
  await removeFacetDiamond("DiamondExchange", exchangeAddr, ["ExchangeClaimFacet"], {
    log: true,
    logSelectors: true,
  });
}

main()
  .then(async () => {
    console.info(`STARTING_BLOCK=${currentBlock.number}`);
    for (const [key, value] of Object.entries(contracts)) {
      console.info(`${camelToSnakeCase(key).toUpperCase()}_ADDR=${(await value.getAddress()).toLowerCase()}`);
    }
  })
  .catch(error => {
    console.error(error);
  });
