import { ethers } from "hardhat";

import { MINTER_ROLE } from "@ethberry/contracts-constants";

import { deployDiamond } from "../../test/Exchange/shared";

async function main() {
  const contractManagerInstance = await deployDiamond(
    "DiamondCM",
    [
      "CollectionFactoryFacet",
      "ERC20FactoryFacet",
      "ERC721FactoryFacet",
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
      log: false,
      logSelectors: false,
    },
  );

  console.info("CONTRACT_MANAGER_ADDR", contractManagerInstance.target);

  // DIAMOND EXCHANGE
  const exchangeInstance = await deployDiamond(
    "DiamondExchange",
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
      "ExchangeRaffleFacet",
      "ExchangeRentableFacet",
      "PausableFacet",
      "AccessControlFacet",
      "DiamondLoupeFacet",
    ],
    "DiamondExchangeInit",
    {
      log: false,
      logSelectors: false,
    },
  );

  console.info("EXCHANGE_ADDR", exchangeInstance.target);

  const useFactoryInstance = await ethers.getContractAt("UseFactoryFacet", contractManagerInstance.target);
  const tx = await useFactoryInstance.addFactory(exchangeInstance.target, MINTER_ROLE);
  await tx.wait();

  return "OK";
}

main()
  .then(console.info)
  .catch(console.error);
