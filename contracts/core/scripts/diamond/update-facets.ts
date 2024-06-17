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

  // BESU DEV
  const exchangeAddr = "0x9368d587335dd04a4f752afaba25de1938eb7ed6"; // staging

  // const diamondContract = await ethers.getContractAt("DiamondLoupeFacet", exchangeAddr);

  // UPDATE DIAMOND EXCHANGE (REPLACE FACET)
  await updateFacetDiamond(
    "DiamondExchange",
    exchangeAddr,
    [
      "ExchangeBreedFacet",
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
      "ExchangePurchaseVestingFacet",
      "ExchangeRaffleFacet",
      "ExchangeRentableFacet",
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
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
