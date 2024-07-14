import { task } from "hardhat/config";
import fs from "fs";
import { AbiCoder, keccak256, toUtf8Bytes } from "ethers";

import ERC20TOKENS from "./test-data/erc20tokens.json";
import ETHDATA from "./test-data/eth_data.json";

enum ContractEventSignature {
  // MODULE:ERC20
  Transfer = "Transfer(address,address,uint256)",
  Approval = "Approval(address,address,uint256)",

  // MODULE:ERC721
  ApprovalForAll = "ApprovalForAll(address,address,bool)",
  DefaultRoyaltyInfo = "DefaultRoyaltyInfo(address,uint96)",
  MintRandom = "MintRandom(uint256,address,uint256,uint256,uint256)",

  TokenRoyaltyInfo = "TokenRoyaltyInfo(uint256,address,uint96)",
  ConsecutiveTransfer = "ConsecutiveTransfer(uint256,uint256,address,address)",
  // Approval = "Approval",
  // Transfer = "Transfer",

  // MODULE:ERC998
  BatchReceivedChild = "BatchReceivedChild(address,uint256,address,uint256[],uint256[])",
  BatchTransferChild = "BatchTransferChild(uint256,address,address,uint256[],uint256[])",
  WhitelistedChild = "WhitelistedChild(address,uint256)",
  UnWhitelistedChild = "UnWhitelistedChild(address)",
  ReceivedChild = "ReceivedChild(address,uint256,address,uint256,uint256)",
  TransferChild = "TransferChild(uint256,address,address,uint256,uint256)",
  SetMaxChild = "SetMaxChild(address,uint256)",

  // MODULE:ERC1155
  TransferBatch = "TransferBatch(address,address,address,uint256[],uint256[])",
  TransferSingle = "TransferSingle(address,address,address,uint256,uint256)",
  URI = "URI(string,uint256)",

  // MODULE:LOTTERY
  RoundFinalized = "RoundFinalized(uint256,uint8[6])",
  // event RoundStarted(uint256 roundId, uint256 startTimestamp, uint256 maxTicket, Asset ticket, Asset price);
  RoundStarted = "RoundStarted(uint256,uint256,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256))",
  RoundEnded = "RoundEnded(uint256,uint256)",
  // event PurchaseLottery(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, bytes32 numbers);
  PurchaseLottery = "PurchaseLottery(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256),uint256,bytes32)",
  // event PurchaseRaffle(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, uint256 index);
  PurchaseRaffle = "PurchaseRaffle(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256),uint256,uint256)",
  Released = "Released(uint256,uint256)",
  Prize = "Prize(address,uint256,uint256,uint256)",

  // MODULE:WRAPPER
  UnpackWrapper = "UnpackWrapper(address,uint256)",

  // MODULE:MYSTERY
  UnpackMysteryBox = "UnpackMysteryBox(address,uint256)",

  // MODULE:PAUSE
  Paused = "Paused(address)",
  Unpaused = "Unpaused(address)",

  // MODULE:VESTING
  EtherReleased = "EtherReleased(uint256)",
  ERC20Released = "ERC20Released(address,uint256)",
  // TODO remove
  EtherReceived = "EtherReceived()",

  // MODULE:ACCESS_LIST
  Blacklisted = "Blacklisted(address)",
  UnBlacklisted = "UnBlacklisted(address)",
  Whitelisted = "Whitelisted(address)",
  UnWhitelisted = "UnWhitelisted(address)",

  // MODULE:ACCESS_CONTROL
  RoleGranted = "RoleGranted(bytes32,address,address)",
  RoleRevoked = "RoleRevoked(bytes32,address,address)",
  RoleAdminChanged = "RoleAdminChanged(bytes32,bytes32,bytes32)",
  OwnershipTransferred = "OwnershipTransferred(address,address)",

  // MODULE:STAKING
  // event RuleCreated(uint256 ruleId, Rule rule);
  RuleCreated = "RuleCreated(uint256,((uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[][],(uint256,uint256,uint256,bool,bool),bool))",
  RuleUpdated = "RuleUpdated(uint256,bool)",
  StakingStart = "StakingStart(uint256,uint256,address,uint256,uint256)",
  StakingWithdraw = "StakingWithdraw(uint256,address,uint256)",
  StakingFinish = "StakingFinish(uint256,address,uint256,uint256)",
  BalanceWithdraw = "BalanceWithdraw(address,(uint8,address,uint256,uint256))",
  DepositReturn = "DepositReturn(uint256,address)",

  // MODULE:EXCHANGE
  // MODULE:CORE
  // event Purchase(address account, uint256 externalId, Asset item, Asset[] price);
  Purchase = "Purchase(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[])",
  // MODULE:CLAIM
  // event Claim(address account, uint256 externalId, Asset[] items);
  Claim = "Claim(address,uint256,(uint8,address,uint256,uint256)[])",
  // MODULE:CRAFT
  // event Craft(address from, uint256 externalId, Asset[] items, Asset[] price);
  Craft = "Craft(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  // MODULE:RENTABLE
  UpdateUser = "UpdateUser(uint256,address,uint64)",
  // event Lend(address from, address to, uint64 expires, uint256 externalId, Asset item, Asset[] price);
  // event LendMany(address from, address to, uint64 expires, uint256 externalId, Asset[] items, Asset[] price);
  Lend = "Lend(address,address,uint64,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[])",
  LendMany = "LendMany(address,address,uint64,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  // MODULE:MYSTERY
  // event Mysterybox(address from, uint256 externalId, Asset[] items, Asset[] price);
  PurchaseMysteryBox = "PurchaseMysteryBox(address,uint256,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256)[])",
  // MODULE:GRADE
  // event Upgrade(address account, uint256 externalId, Asset item, Asset[] price, bytes32 attribute, uint256 level);
  Upgrade = "Upgrade(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256)[],bytes32,uint256)",
  // MODULE:WAITLIST
  //   event WaitListRewardSet(uint256 externalId, bytes32 root, Asset[] items);
  //   event WaitListRewardClaimed(address account, uint256 externalId, Asset[] items);
  WaitListRewardSet = "WaitListRewardSet(uint256,bytes32,(uint8,address,uint256,uint256)[])",
  WaitListRewardClaimed = "WaitListRewardClaimed(address,uint256,(uint8,address,uint256,uint256)[])",
  // MODULE:BREEDING
  // event Breed(address from, uint256 externalId, Asset matron, Asset sire);
  Breed = "Breed(address,uint256,(uint8,address,uint256,uint256),(uint8,address,uint256,uint256))",
  // MODULE:GRADE
  // event LevelUp(address account, uint256 tokenId, bytes32 attribute, uint256 value);
  LevelUp = "LevelUp(address,uint256,bytes32,uint256)",
  MetadataUpdate = "MetadataUpdate(uint256)",
  BatchMetadataUpdate = "BatchMetadataUpdate(uint256,uint256)",
  // MODULE:PAYMENT_SPLITTER
  PayeeAdded = "PayeeAdded(address,uint256)",
  PaymentReleased = "PaymentReleased(address,uint256)",
  ERC20PaymentReleased = "ERC20PaymentReleased(address,address,uint256)",
  PaymentReceived = "PaymentReceived(address,uint256)",
  PaymentEthReceived = "PaymentEthReceived(address,uint256)",
  PaymentEthSent = "PaymentEthSent(address,uint256)",

  // MODULE:CHAINLINKV2
  RandomWordsRequested = "RandomWordsRequested(bytes32,uint256,uint256,uint64,uint16,uint32,uint32,address)",

  // MODULE:ECOMMERCE
  EcommercePurchase = "EcommercePurchase(??)",

  // MODULE:CM
  // event VestingDeployed(address account, uint256 externalId, VestingArgs args, Asset[] items);
  VestingDeployed = "VestingDeployed(address,uint256,(address,uint64,uint16,uint16),(uint8,address,uint256,uint256)[])",
  // event ERC20TokenDeployed(address account, uint256 externalId, Erc20Args args);
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
}

export const keccak256It = function (value: string): string {
  return keccak256(toUtf8Bytes(value));
};

export const abiEncode = function (value: string, type: string): string {
  const abiCoder = new AbiCoder();
  return abiCoder.encode([type], [value]);
};

task("topics", "Generate topics", async (_, hre) => {
  const _blockNumber = await hre.ethers.provider.getBlockNumber();
  const topicS: Array<any> = [];
  const topicSEnum: Array<any> = [];
  console.info("ContractEventSignature len:", Object.values(ContractEventSignature).length);
  Object.values(ContractEventSignature).map((value, index) => {
    topicS.push(keccak256It(value));
    topicSEnum.push(`${value} = "${keccak256It(value)}"`);
    return index;
  });
  fs.writeFileSync("topics.txt", topicS.toString(), { encoding: "utf-8", flag: "w+" });
  fs.writeFileSync("topics_enum.txt", topicSEnum.toString(), { encoding: "utf-8", flag: "w+" });

  Object.keys(ERC20TOKENS).map((key, indx) =>
    fs.appendFileSync(`ERC20tokens.txt`, `${Object.values(ERC20TOKENS)[indx].address},\n`),
  );
  // addresses new Set
  const unique = [...new Set(ETHDATA.addresses)];
  unique.map(addr => fs.appendFileSync(`addr_topic.txt`, `"${abiEncode(addr, "address")}",\n`));
});
