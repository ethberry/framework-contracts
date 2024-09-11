import { ethers } from "hardhat";
import fs from "fs";
import { camelToSnakeCase } from "@gemunion/contracts-helpers";
import { updateFacetDiamond } from "../../test/Exchange/shared";

const currentBlock: { number: number } = { number: 1 };
const contracts: Record<string, any> = {};

async function main() {
  const block = await ethers.provider.getBlock("latest");
  currentBlock.number = block!.number;
  fs.appendFileSync(`${process.cwd()}/log.txt`, `STARTING_BLOCK=${currentBlock.number}\n`);

  // const exchangeAddr = "0xdb6371a89e3c840a14de470dd0247cc7459fa2a2"; // dev besu
  // const exchangeAddr = "0x9368d587335dd04a4f752afaba25de1938eb7ed6"; // staging besu

  // const cmAddr = "0x9a038b61f10e4fa12edd44942cbf1e42c5f19e8d"; // staging besu
  const cmAddr = "0x72aadd98db1aac58f7c1f491007e3aa301221f4c"; // binance prod

  // const diamondContract = await ethers.getContractAt("DiamondLoupeFacet", exchangeAddr);

  // UPDATE DIAMOND EXCHANGE (REPLACE FACET)
  await updateFacetDiamond(
    // "DiamondExchange",
    "DiamondCM",
    // exchangeAddr,
    cmAddr,
    [
      "VestingFactoryFacet",
      // "ExchangeBreedFacet",
      // "ExchangeClaimFacet",
      // "ExchangeCraftFacet",
      // "ExchangeDismantleFacet",
      // "ExchangeGradeFacet",
      // "ExchangeLootBoxFacet",
      // "ExchangeLotteryFacet",
      // "ExchangeMergeFacet",
      // "ExchangeMockFacet",
      // "ExchangeMysteryBoxFacet",
      // "ExchangePurchaseFacet",
      // "ExchangePurchaseVestingFacet",
      // "ExchangeRaffleFacet",
      // "ExchangeRentableFacet",
    ],
    {
      log: true,
      logSelectors: true,
    },
  );
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
