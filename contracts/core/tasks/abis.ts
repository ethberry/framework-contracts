import { task, types } from "hardhat/config";
import fs from "fs";
import path from "path";

export interface IAbiObj {
  name: string;
  type: string;
}

export interface IArtifact {
  abi: Array<IAbiObj>;
}

// LIST OF EVENTS WE NEED TO INCLUDE TO @FW/PACKAGES
export enum ContractEventSignatures {
  Approval = "Approval(address,address,uint256)",
  Transfer = "Transfer(address,address,uint256)",
  ApprovalForAll = "ApprovalForAll(address,address,bool)",
  DefaultRoyaltyInfo = "DefaultRoyaltyInfo(address,uint96)",
  MintRandom = "MintRandom(uint256,address,uint256[],uint256,uint256)",
  TokenRoyaltyInfo = "TokenRoyaltyInfo(uint256,address,uint96)",
  ConsecutiveTransfer = "ConsecutiveTransfer(uint256,uint256,address,address)",
  BatchReceivedChild = "BatchReceivedChild(address,uint256,address,uint256[],uint256[])",
  BatchTransferChild = "BatchTransferChild(uint256,address,address,uint256[],uint256[])",
  WhitelistedChild = "WhitelistedChild(address,uint256)",
  UnWhitelistedChild = "UnWhitelistedChild(address)",
  ReceivedChild = "ReceivedChild(address,uint256,address,uint256,uint256)",
  TransferChild = "TransferChild(uint256,address,address,uint256,uint256)",
  SetMaxChild = "SetMaxChild(address,uint256)",
  TransferBatch = "TransferBatch(address,address,address,uint256[],uint256[])",
  TransferSingle = "TransferSingle(address,address,address,uint256,uint256)",
  URI = "URI(string,uint256)",
  Merge = "Merge(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  RoundFinalizedRaffle = "RoundFinalized(uint256,uint256,uint256)",
  RoundFinalized = "RoundFinalized(uint256,uint8[6])",
  RoundStarted = "RoundStarted(uint256,uint256,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256))",
  RoundEnded = "RoundEnded(uint256,uint256)",
  PurchaseLottery = "PurchaseLottery(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256),uint256,bytes32)",
  PurchaseRaffle = "PurchaseRaffle(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256),uint256,uint256)",
  Released = "Released(uint256,uint256)",
  Prize = "Prize(address,uint256,uint256,uint256)",
  UnpackWrapper = "UnpackWrapper(uint256)",
  UnpackMysteryBox = "UnpackMysteryBox(address,uint256)",
  Paused = "Paused(address)",
  Unpaused = "Unpaused(address)",
  EtherReleased = "EtherReleased(uint256)",
  ERC20Released = "ERC20Released(address,uint256)",
  EtherReceived = "EtherReceived()",
  Blacklisted = "Blacklisted(address)",
  UnBlacklisted = "UnBlacklisted(address)",
  Whitelisted = "Whitelisted(address)",
  UnWhitelisted = "UnWhitelisted(address)",
  RoleGranted = "RoleGranted(bytes32,address,address)",
  RoleRevoked = "RoleRevoked(bytes32,address,address)",
  RoleAdminChanged = "RoleAdminChanged(bytes32,bytes32,bytes32)",
  DefaultAdminTransferScheduled = "DefaultAdminTransferScheduled(address,uint48)",
  DefaultAdminTransferCanceled = "DefaultAdminTransferCanceled()",
  DefaultAdminDelayChangeScheduled = "DefaultAdminDelayChangeScheduled(uint48,uint48)",
  DefaultAdminDelayChangeCanceled = "DefaultAdminDelayChangeCanceled()",
  OwnershipTransferred = "OwnershipTransferred(address,address)",
  OwnershipTransferStarted = "OwnershipTransferStarted(address,address)",
  RuleCreated = "RuleCreated(uint256,((uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[][],(uint256,uint256,uint256,bool,bool),bool))",
  RuleUpdated = "RuleUpdated(uint256,bool)",
  StakingStart = "StakingStart(uint256,uint256,address,uint256,uint256)",
  StakingWithdraw = "StakingWithdraw(uint256,address,uint256)",
  StakingFinish = "StakingFinish(uint256,address,uint256,uint256)",
  BalanceWithdraw = "BalanceWithdraw(address,(uint8,address,uint256,uint256))",
  DepositReturn = "DepositReturn(uint256,address)",
  DepositStart = "DepositStart(uint256,uint256,address,uint256,uint256[])",
  DepositWithdraw = "DepositWithdraw(uint256,address,uint256)",
  DepositFinish = "DepositFinish(uint256,address,uint256,uint256)",
  DepositPenalty = "DepositPenalty(uint256,(uint8,address,uint256,uint256))",
  Purchase = "Purchase(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[])",
  Claim = "Claim(address,uint256,(uint8,address,uint256,uint256)[])",
  Craft = "Craft(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  UpdateUser = "UpdateUser(uint256,address,uint64)",
  Lend = "Lend(address,address,uint64,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[])",
  LendMany = "LendMany(address,address,uint64,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  PurchaseMysteryBox = "PurchaseMysteryBox(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  Upgrade = "Upgrade(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[],bytes32,uint256)",
  WaitListRewardSet = "WaitListRewardSet(uint256,bytes32,(uint8,address,uint256,uint256)[])",
  WaitListRewardClaimed = "WaitListRewardClaimed(address,uint256,(uint8,address,uint256,uint256)[])",
  Breed = "Breed(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256))",
  LevelUp = "LevelUp(address,uint256,bytes32,uint256)",
  Dismantle = "Dismantle(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  MetadataUpdate = "MetadataUpdate(uint256)",
  BatchMetadataUpdate = "BatchMetadataUpdate(uint256,uint256)",
  PayeeAdded = "PayeeAdded(address,uint256)",
  PaymentReleased = "PaymentReleased(address,uint256)",
  ERC20PaymentReleased = "ERC20PaymentReleased(address,address,uint256)",
  PaymentReceived = "PaymentReceived(address,uint256)",
  PaymentEthReceived = "PaymentEthReceived(address,uint256)",
  PaymentEthSent = "PaymentEthSent(address,uint256)",
  RuleCreatedP = "RuleCreatedP(uint256,((uint8,address,uint256,uint256),(uint8,address,uint256,uint256),(uint256,uint256,uint256),bool))",
  FinalizedToken = "FinalizedToken(address,uint256)",
  WithdrawToken = "WithdrawToken(address,uint256)",
  ReferralBonus = "ReferralBonus(address,address,uint256)",
  RandomWordsRequested = "RandomWordsRequested(bytes32,uint256,uint256,uint64,uint16,uint32,uint32,address)",
  RandomnessRequestId = "RandomnessRequestId(bytes32,address)",
  SubscriptionConsumerAdded = "SubscriptionConsumerAdded(uint64,address)",
  SubscriptionCreated = "SubscriptionCreated(uint64,address)",
  VrfSubscriptionSet = "VrfSubscriptionSet(uint64)",
  EcommercePurchase = "EcommercePurchase(??)",
  ReferralEvent = "ReferralEvent(address,address,(uint8,address,uint256,uint256)[])",
  ReferralProgram = "ReferralProgram((uint256,uint256,uint8,bool))",
  ReferralReward = "ReferralReward(address,address,uint8,address,uint256)",
  ReferralWithdraw = "ReferralWithdraw(address,address,uint256)",
  VestingDeployed = "VestingDeployed(address,uint256,(address,uint64,uint16,uint16),(uint8,address,uint256,uint256)[])",
  ERC20TokenDeployed = "ERC20TokenDeployed(address,uint256,(string,string,uint256,string))",
  ERC721TokenDeployed = "ERC721TokenDeployed(address,uint256,(string,string,uint96,string,string))",
  ERC998TokenDeployed = "ERC998TokenDeployed(address,uint256,(string,string,uint96,string,string))",
  ERC1155TokenDeployed = "ERC1155TokenDeployed(address,uint256,(uint96,string,string))",
  MysteryBoxDeployed = "MysteryBoxDeployed(address,uint256,(string,string,uint96,string,string))",
  CollectionDeployed = "CollectionDeployed(address,uint256,(string,string,uint96,string,uint96,string))",
  PonziDeployed = "PonziDeployed(address,uint256,(address[],uint256[],string))",
  StakingDeployed = "StakingDeployed(address,uint256,(string))",
  LotteryDeployed = "LotteryDeployed(address,uint256,((uint256,uint256)))",
  RaffleDeployed = "RaffleDeployed(address,uint256)",
  WaitListDeployed = "WaitListDeployed(address,uint256)",
  PaymentSplitterDeployed = "PaymentSplitterDeployed(address,uint256,(address[],uint256[]))",
  TransferReceived = "TransferReceived(address,address,uint256,bytes)",
}
export const fwEventNames = Object.keys(ContractEventSignatures).map(key => key.toString());

// LIST OF FUNCTIONS WE NEED TO INCLUDE TO @FW/PACKAGES
export const fwFunctionNames = [
  "addConsumer",
  "approve",
  "balanceOf",
  "blacklist",
  "breed",
  "claim",
  "craft",
  "createSubscription",
  "deployCollection",
  "deployERC1155Token",
  "deployERC20Token",
  "deployERC721Token",
  "deployERC998Token",
  "deployLottery",
  "deployMysterybox",
  "deployPaymentSplitter",
  "deployPonzi",
  "deployRaffle",
  "deployStaking",
  "deployVesting",
  "deployWaitList",
  "deposit",
  "dismantle",
  "disperse",
  "endRound",
  "getERC20",
  "getBalance",
  "getPenalty",
  "getPrize",
  "getSubscription",
  "grantRole",
  "lend",
  "merge",
  "mint",
  "mintBox",
  "mintCommon",
  "pause",
  "purchase",
  "purchaseLottery",
  "purchaseMystery",
  "purchaseRaffle",
  "receiveReward",
  "releasable",
  "release",
  "releaseFunds",
  "renounceRole",
  "revokeRole",
  "safeTransferChild",
  "safeTransferFrom",
  "safeTransferFromERC1155",
  "setApprovalForAll",
  "setBaseURI",
  "setDefaultRoyalty",
  "setPregnancyLimits",
  "setReward",
  "setRules",
  "setSubscriptionId",
  "spend",
  "startRound",
  "topUp",
  "transfer",
  "transferAndCall",
  "transferERC20",
  "transferOwnership",
  "unBlacklist",
  "unWhitelist",
  "unWhitelistChild",
  "unpack",
  "unpause",
  "updateRule",
  "upgrade",
  "userOf",
  "whiteListChild",
  "whitelist",
  "withdrawBalance",
  "withdrawReward",
  "withdrawToken",
];

task("abis", "Save all functions abi separately")
  .addOptionalVariadicPositionalParam("files", "The files to include", undefined, types.inputFile)
  .setAction(async ({ files = "artifacts/contracts/" }, hre) => {
    const artfcts = await hre.artifacts.getArtifactPaths();
    const conart = artfcts
      .filter(art => art.includes(`${process.cwd()}/${files}`) || art.includes("@gemunion/contracts-chain-link-v2"))
      .filter(art => !art.includes(`/interfaces`));

    const globFuncArr: Array<string> = [];
    const globEventArr: Array<string> = [];
    const fwFuncArr: Array<string> = [];
    const fwEventArr: Array<IAbiObj> = [];

    // const importArr: Array<string> = [];
    // const exportArr: Array<string> = [];

    if (!fs.existsSync("./abis")) {
      fs.mkdirSync("./abis");
    }

    // FW
    // packages/abis/src/abis/balanceOf.json
    // if (!fs.existsSync("../../packages/abis/src/abis")) {
    //   fs.mkdirSync("../../packages/abis/src/abis");
    // }

    for (const art of conart) {
      const name = path.parse(art).name;

      const abif: IArtifact = JSON.parse(fs.readFileSync(art, "utf8"));

      // filer functions
      const abifunct = abif.abi.filter(item => item.type === "function");
      // filter events
      const abievents = abif.abi.filter(item => item.type === "event");

      // functions
      for (const func of abifunct) {
        const isUnique = globFuncArr.indexOf(JSON.stringify(func)) === -1;

        if (isUnique) {
          globFuncArr.push(JSON.stringify(func));

          const funcabifile = `${name}.${func.name}`;

          if (fs.existsSync(`./abis/${funcabifile}.json`)) {
            const abifile: Array<IAbiObj> = JSON.parse(fs.readFileSync(`./abis/${funcabifile}.json`, "utf8"));
            const notIncludes = abifile.map(f => JSON.stringify(f)).indexOf(JSON.stringify(func)) === -1;

            if (notIncludes) {
              abifile.push(func);
              fs.writeFileSync(`./abis/${funcabifile}.json`, JSON.stringify(abifile), {
                encoding: "utf-8",
                flag: "w+",
              });
            }
          } else {
            fs.writeFileSync(`./abis/${funcabifile}.json`, JSON.stringify([func]), { encoding: "utf-8", flag: "w+" });
          }

          // FRAMEWORK ABIS
          if (fwFunctionNames.includes(func.name)) {
            const unique = fwFuncArr.indexOf(JSON.stringify(func)) === -1;
            if (unique) {
              fwFuncArr.push(JSON.stringify(func));

              // create folder
              if (!fs.existsSync(`../../packages/abis/${func.name}`)) {
                fs.mkdirSync(`../../packages/abis/${func.name}`);
              }

              // const filepath = `./abis/!fw/${func.name}.json`;
              // const filepath = `../../packages/abis/src/abis/${func.name}.json`;
              const filepath = `../../packages/abis/${func.name}/${name}.json`;

              if (fs.existsSync(filepath)) {
                const oldfile: Array<IAbiObj> = JSON.parse(fs.readFileSync(filepath, "utf8"));
                const notIncludes = oldfile.map(f => JSON.stringify(f)).indexOf(JSON.stringify(func)) === -1;

                if (notIncludes) {
                  oldfile.push(func);
                  fs.writeFileSync(filepath, JSON.stringify(oldfile), {
                    encoding: "utf-8",
                    flag: "w+",
                  });
                }
              } else {
                // exportArr.push(`export const ${func.name}${name}ABI = ${func.name}${name};`);
                // importArr.push(`import ${func.name}${name} from "./abis/${func.name}/${name}.json";`);
                fs.writeFileSync(filepath, JSON.stringify([func]), {
                  encoding: "utf-8",
                  flag: "w+",
                });
              }
            }
          }
        }
      }

      // events
      for (const event of abievents) {
        const isUnique = globEventArr.indexOf(JSON.stringify(event)) === -1;

        if (isUnique) {
          globEventArr.push(JSON.stringify(event));

          // FRAMEWORK EVENT ABIS
          if (fwEventNames.includes(event.name)) {
            const unique = fwEventArr.indexOf(event) === -1;
            if (unique) {
              // fwEventArr.push(JSON.stringify(event));
              fwEventArr.push(event);
            }
          }
        }
      }

      // create folder
      if (!fs.existsSync(`../../packages/abis/events`)) {
        fs.mkdirSync(`../../packages/abis/events`);
      }
      const filepath = `../../packages/abis/events/fw-events.json`;

      fs.writeFileSync(filepath, JSON.stringify(fwEventArr), {
        encoding: "utf-8",
        flag: "w+",
      });
    }
  });

// hardhat abi contracts/ERC20/
