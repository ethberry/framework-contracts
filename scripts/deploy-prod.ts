import { ethers } from "hardhat";
import { Contract } from "ethers";
import fs from "fs";

import { blockAwait, blockAwaitMs } from "@ethberry/contracts-helpers";
import { camelToSnakeCase } from "@ethberry/utils";
import { METADATA_ROLE, MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployDiamond } from "../test/Exchange/shared";
// import { deployDiamond_BSC } from "../test/Exchange/shared/fixture_bsc";

const delay = 2; // block delay
const delayMs = 1100; // block delay ms

// COST TEST-NET
// 0.953918023227665418 BNB
// 0.734582158227665418 BNB

// COST MAINNET
// BNB 0.87705253
// $272
// BNB 0.87705253 ~ $275

interface IObj {
  address?: string;
  hash?: string;
}

const debug = async (obj: IObj | Record<string, Contract>, name?: string) => {
  if (obj?.hash) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/restrict-template-expressions
    console.info(`${name} tx: ${obj.hash}`);
    await blockAwaitMs(delayMs);
  } else {
    console.info(`${Object.keys(obj).pop()} deployed`);
    const tx = Object.values(obj).pop();
    const contract = tx;
    await blockAwait(delay, delayMs);
    const address = await contract.getAddress();
    fs.appendFileSync(
      `${process.cwd()}/log.txt`,
      // `${camelToSnakeCase(Object.keys(obj).pop() || "none").toUpperCase()}_ADDR=${contract && contract.address ? contract.address.toLowerCase : "--"}\n`,
      `${camelToSnakeCase(Object.keys(obj).pop() || "none").toUpperCase()}_ADDR=${address.toLowerCase() || "--"}\n`,
    );
  }
};

const contracts: Record<string, any> = {};
const currentBlock: { number: number } = { number: 1 };

async function main() {
  const block = await ethers.provider.getBlock("latest");
  currentBlock.number = block!.number;
  fs.appendFileSync(
    `${process.cwd()}/log.txt`,
    // `${camelToSnakeCase(Object.keys(obj).pop() || "none").toUpperCase()}_ADDR=${contract && contract.address ? contract.address.toLowerCase : "--"}\n`,
    `STARTING_BLOCK=${currentBlock.number}\n`,
  );

  // LINK & VRF - HAVE TO PASS VRF AND LINK ADDRESSES TO CHAINLINK-BESU CONCTRACT
  // DIAMOND CM
  const cmInstance = await deployDiamond(
    "DiamondCM",
    [
      "ERC721FactoryFacet",
      "CollectionFactoryFacet",
      "ERC20FactoryFacet",
      "ERC998FactoryFacet",
      "ERC1155FactoryFacet",
      "LotteryFactoryFacet",
      "LootBoxFactoryFacet",
      "MysteryBoxFactoryFacet",
      "PonziFactoryFacet",
      "RaffleFactoryFacet",
      "StakingFactoryFacet",
      "VestingFactoryFacet",
      "WaitListFactoryFacet",
      "PaymentSplitterFactoryFacet",
      "UseFactoryFacet",
      "AccessControlFacet",
      "PausableFacet",
      "DiamondLoupeFacet",
    ],
    "DiamondCMInit",
    {
      log: true,
      logSelectors: false,
    },
  );
  contracts.contractManager = cmInstance;
  await debug(contracts);

  // const factoryInstance = await ethers.getContractAt("UseFactoryFacet", await contracts.contractManager.getAddress());
  const factoryInstance = await ethers.getContractAt("UseFactoryFacet", "0x7130f69618f590ad3e9655924bd5435136ce6d2f");

  // console.info("contracts.contractManager.address", contracts.contractManager.address);

  // DIAMOND EXCHANGE
  const exchangeInstance = await deployDiamond(
    "DiamondExchange",
    [
      "ExchangeGenesFacet",
      "ExchangeClaimFacet",
      "ExchangeCraftFacet",
      "ExchangeDismantleFacet",
      "ExchangeGradeFacet",
      "ExchangeLootBoxFacet",
      "ExchangeLotteryFacet",
      "ExchangeMergeFacet",
      // "ExchangeMockFacet",
      "ExchangeMysteryBoxFacet",
      "ExchangePurchaseFacet",
      "ExchangeRaffleFacet",
      "ExchangeRentableFacet",
      "PausableFacet",
      "AccessControlFacet",
      "DiamondLoupeFacet",
    ],
    "DiamondExchangeInit",
    {
      log: true,
      logSelectors: false,
    },
  );
  contracts.exchange = exchangeInstance;
  await debug(contracts);

  await debug(
    await factoryInstance.addFactory(await exchangeInstance.getAddress(), MINTER_ROLE),
    "contractManager.addFactory",
  );

  await debug(
    await factoryInstance.addFactory(await exchangeInstance.getAddress(), METADATA_ROLE),
    "contractManager.addFactory",
  );

  // // DEPLOY DISPENSER
  // const dispenserFactory = await ethers.getContractFactory("Dispenser");
  // contracts.dispenser = await dispenserFactory.deploy();
  // await debug(contracts);
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
