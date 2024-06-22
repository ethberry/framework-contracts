import { ethers } from "hardhat";
import fs from "fs";
import { blockAwait, camelToSnakeCase } from "@gemunion/contracts-helpers";
import { MINTER_ROLE } from "@gemunion/contracts-constants";

import { updateFacetDiamond } from "../../test/Exchange/shared";
import * as process from "node:process";

const currentBlock: { number: number } = { number: 1 };
const contracts: Record<string, any> = {};

async function main() {
  const block = await ethers.provider.getBlock("latest");
  currentBlock.number = block!.number;
  fs.appendFileSync(`${process.cwd()}/log.txt`, `STARTING_BLOCK=${currentBlock.number}\n`);

  const exchangeAddr = "0xdb6371a89e3c840a14de470dd0247cc7459fa2a2"; // dev besu
  // const exchangeAddr = "0x9368d587335dd04a4f752afaba25de1938eb7ed6"; // staging besu
  // const exchangeAddr = "0x20ca70b79e60c75ef2c89d0a575b3f19371826c1"; // staging telos_test

  const cmAddr = "0xfeae27388a65ee984f452f86effed42aabd438fd"; // staging besu
  // const cmAddr = "0xda4cdbe84970cb7acc816f8d24e3ebc74cd3d57b"; // staging telos_test

  // const diamondContract = await ethers.getContractAt("DiamondLoupeFacet", exchangeAddr);

  const cmFactoryFacet = await ethers.getContractAt("UseFactoryFacet", cmAddr);

  // ADD FACTORY
  // await cmFactoryFacet.addFactory(exchangeAddr, MINTER_ROLE);

  const minters = await cmFactoryFacet.getMinters();
  const manipulators = await cmFactoryFacet.getManipulators();

  console.info("minters", minters);
  console.info("manipulators", manipulators);

  process.exit(0);

  for (const factory of minters) {
    if (factory.toLowerCase() !== exchangeAddr.toLowerCase()) {
      await cmFactoryFacet.removeFactory(factory, MINTER_ROLE);
      const min1 = await cmFactoryFacet.getMinters();
      await blockAwait(1);
      console.info(`minter ${min1.length} from ${minters.length - 1} removed`);
    }
  }

  for (const factory of manipulators) {
    if (factory.toLowerCase() !== exchangeAddr.toLowerCase()) {
      await cmFactoryFacet.removeFactory(factory, MINTER_ROLE);
      const min1 = await cmFactoryFacet.getManipulators();
      await blockAwait(1);
      console.info(`manipulator ${min1.length} from ${minters.length - 1} removed`);
    }
  }

  // UPDATE DIAMOND EXCHANGE (REPLACE FACET)
  await updateFacetDiamond(
    // "DiamondExchange",
    "DiamondCM",
    // exchangeAddr,
    cmAddr,
    ["ERC20FactoryFacet", "LootBoxFactoryFacet", "MysteryBoxFactoryFacet", "StakingFactoryFacet"],
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
