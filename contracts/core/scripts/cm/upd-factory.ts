import { ethers } from "hardhat";
import fs from "fs";
import { blockAwait, camelToSnakeCase } from "@gemunion/contracts-helpers";
import { MINTER_ROLE } from "@gemunion/contracts-constants";

// import { addFacetDiamond, updateFacetDiamond } from "../../test/Exchange/shared";
import * as process from "node:process";

const currentBlock: { number: number } = { number: 1 };
const contracts: Record<string, any> = {};

async function main() {
  const block = await ethers.provider.getBlock("latest");
  currentBlock.number = block!.number;
  fs.appendFileSync(`${process.cwd()}/log.txt`, `STARTING_BLOCK=${currentBlock.number}\n`);

  // const exchangeAddr = "0xdb6371a89e3c840a14de470dd0247cc7459fa2a2"; // dev besu
  // const exchangeAddr = "0x9368d587335dd04a4f752afaba25de1938eb7ed6"; // staging besu
  // const exchangeAddr = "0xa712c7640a579967c2f7c6dbeb384a613b0a61aa"; // staging amoy
  // const exchangeAddr = "0xa712c7640a579967c2f7c6dbeb384a613b0a61aa"; // staging manta
  // const exchangeAddr = "0xa712c7640a579967c2f7c6dbeb384a613b0a61aa"; // staging telos
  // const exchangeAddr = "0x20ca70b79e60c75ef2c89d0a575b3f19371826c1"; // staging telos_test
  // const exchangeAddr = "0x006712cb39def6749e827dca806595fb7420539e"; // prod bnb test
  const exchangeAddr = "0xa98b234dd2b0f6790e8e2ccf12673977d33756e8"; // prod bnb main

  // const cmAddr = "0xfeae27388a65ee984f452f86effed42aabd438fd"; // staging besu
  // const cmAddr = "0x9a038b61f10e4fa12edd44942cbf1e42c5f19e8d"; // staging besu
  // const cmAddr = "0xd76746ff27eee2bbbe37228571b0b322d73976ed"; // staging amoy
  // const cmAddr = "0xd76746ff27eee2bbbe37228571b0b322d73976ed"; // staging manta
  // const cmAddr = "0xda4cdbe84970cb7acc816f8d24e3ebc74cd3d57b"; // staging telos_test
  // const cmAddr = "0xda436b6b4ca6d20a604e0037e4a2d9f6261feaea"; // prod bnb test
  const cmAddr = "0x72aadd98db1aac58f7c1f491007e3aa301221f4c"; // prod bnb main

  // const diamondContract = await ethers.getContractAt("DiamondLoupeFacet", exchangeAddr);

  // # AMOY
  //   STARTING_BLOCK_AMOY=8387563
  //   CONTRACT_MANAGER_AMOY_ADDR=0xd76746ff27eee2bbbe37228571b0b322d73976ed
  //   EXCHANGE_AMOY_ADDR=0xa712c7640a579967c2f7c6dbeb384a613b0a61aa
  //   DISPENSER_AMOY_ADDR=0xd210e407f0c1dd693990708ef0a59a06c775a8fb

  const cmFactoryFacet = await ethers.getContractAt("UseFactoryFacet", cmAddr);

  // ADD FACTORY
  // await cmFactoryFacet.addFactory(exchangeAddr, MINTER_ROLE);

  const minters = await cmFactoryFacet.getMinters();
  const manipulators = await cmFactoryFacet.getManipulators();

  console.info("minters", minters);
  console.info("manipulators", manipulators);

  for (const factory of minters) {
    if (factory.toLowerCase() !== exchangeAddr.toLowerCase()) {
      await cmFactoryFacet.removeFactory(factory, MINTER_ROLE);
      await blockAwait(2, 1100);

      const min1 = await cmFactoryFacet.getMinters();
      console.info(`minter ${min1.length} from ${minters.length - 1} removed`);
    }
  }

  for (const factory of manipulators) {
    if (factory.toLowerCase() !== exchangeAddr.toLowerCase()) {
      await cmFactoryFacet.removeFactory(factory, MINTER_ROLE);
      await blockAwait(2, 1100);
      const min1 = await cmFactoryFacet.getManipulators();
      console.info(`manipulator ${min1.length} from ${minters.length - 1} removed`);
    }
  }

  /*

  // UPDATE DIAMOND (ADD FACET) !!!
  await addFacetDiamond("DiamondCM", cmAddr, ["DiamondLoupeFacet", "LootBoxFactoryFacet"], {
    log: true,
    logSelectors: true,
  });

  // UPDATE DIAMOND EXCHANGE (REPLACE FACET)
  await updateFacetDiamond(
    // "DiamondExchange",
    "DiamondCM",
    // exchangeAddr,
    cmAddr,
    ["ERC20FactoryFacet", "MysteryBoxFactoryFacet", "StakingFactoryFacet"],
    {
      log: true,
      logSelectors: true,
    },
  );

   */
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
