import { ethers, network } from "hardhat";
import { hexlify, randomBytes, Result, toBeHex, WeiPerEther, zeroPadValue } from "ethers";
import { blockAwait } from "@gemunion/contracts-helpers";
import { ERC721RandomBesu, VRFCoordinatorV2Mock } from "../../typechain-types";
import { baseTokenURI, royalty } from "@gemunion/contracts-constants";
import { recursivelyDecodeResult } from "../../test/utils";

const wait = 2;
async function main() {
  const SUB_ID = 1;
  const RANDOM_ADDR = "";

  const subscriptionId = zeroPadValue(toBeHex(SUB_ID), 32);
  console.info("subscriptionId is", SUB_ID, subscriptionId);
  const [_owner, _receiver, _stranger1, stranger2] = await ethers.getSigners();
  const linkOwner = network.name === "besu" ? _owner : stranger2;

  const vrfInstance: VRFCoordinatorV2Mock = await ethers.getContractAt(
    "VRFCoordinatorV2Mock",
    "0xa50a51c09a5c451c52bb714527e1974b686d8e77",
  );
  const subs = await vrfInstance.getSubscription(SUB_ID);
  const subData = recursivelyDecodeResult(subs as unknown as Result);
  console.info("Subscription", subData);

  const linkInstance = await ethers.getContractAt("LinkToken", "0x42699A7612A82f1d9C36148af9C77354759b210b");
  // GET LINK TOKEN to OWNER
  const linkAmount = WeiPerEther * 1000n;
  await linkInstance.connect(linkOwner).transfer(_owner.address, network.name === "besu" ? 0 : linkAmount);

  // FUND SUBSCRIPTION
  console.info("sub.lowBalance", subs.balance < WeiPerEther);
  console.info("subData.lowBalance", subData.balance < WeiPerEther);
  const txf = await linkInstance.transferAndCall(
    await vrfInstance.getAddress(),
    subs.balance < WeiPerEther ? WeiPerEther : 0,
    subscriptionId,
  );
  console.info(`transferAndCall:`, txf.hash);

  // ERC721 contract - random
  // const itemrInstance = await ethers.getContractAt("ERC721RandomBesu", "0xad9d9e5619f9fcd9540dcc6da29a07d743c5aca5");
  const erc721RandomFactory = await ethers.getContractFactory("ERC721RandomBesu");
  const itemrInstance: ERC721RandomBesu =
    RANDOM_ADDR === ""
      ? await erc721RandomFactory.deploy("ERC721 WEAPON", "RNG721", royalty, baseTokenURI)
      : await ethers.getContractAt("ERC721RandomBesu", RANDOM_ADDR);
  console.info("Random addr:", await itemrInstance.getAddress());
  await blockAwait(wait);
  const _sub0 = await itemrInstance.getSub();
  console.info("random_sub_old", _sub0);
  await itemrInstance.setSubscriptionId(SUB_ID);
  await blockAwait(wait);
  const _sub = await itemrInstance.getSub();
  console.info("random_sub_new", _sub);

  const eventFilter00 = itemrInstance.filters.VrfSubscriptionSet();
  const events00 = await itemrInstance.queryFilter(eventFilter00);
  const eventData00 = recursivelyDecodeResult(events00[events00.length - 1].args as unknown as Result);
  console.info("random.VrfSubscriptionSet_events", eventData00);

  const txconsumer = await vrfInstance.addConsumer(BigInt(SUB_ID), await itemrInstance.getAddress());
  console.info(`addConsumer:`, txconsumer.hash);
  await blockAwait(wait);
  // check consumer
  console.info(
    "Subscription",
    recursivelyDecodeResult((await vrfInstance.getSubscription(SUB_ID)) as unknown as Result),
  );

  const tx0 = await itemrInstance.mintRandom(_owner.address, 701002);
  console.info(`Random asked:`, tx0.hash);
  await blockAwait(wait);

  const eventFilter0 = vrfInstance.filters.RandomWordsRequested();
  const events0 = await vrfInstance.queryFilter(eventFilter0);
  const eventData0 = recursivelyDecodeResult(events0[events0.length - 1].args as unknown as Result);
  console.info("vrfInstance.RandomWordsRequested", eventData0);
  const rId = eventData0.requestId;
  console.info("rId", rId);
  const randomness = hexlify(randomBytes(32));
  // const randomness = toBeHex(32);
  console.info("randomness", randomness);
  // await blockAwait(wait);
  const block = await ethers.provider.getBlock("latest");
  const currentBlock = block!.number;

  const tx = await vrfInstance.fulfillRandomWords(
    eventData0.requestId,
    eventData0.keyHash,
    randomness,
    {
      blockNum: currentBlock,
      subId: eventData0.subId,
      callbackGasLimit: eventData0.callbackGasLimit,
      numWords: eventData0.numWords,
      sender: eventData0.sender,
    },
    { gasLimit: 1000000 },
  );
  console.info("fulfillRandomWords, tx.hash", tx.hash);
  // console.info("fulfillRandomWords, tx", await tx.wait());
  await blockAwait(wait);
  const eventFilter01 = vrfInstance.filters.RandomWordsFulfilled();
  const events001 = await vrfInstance.queryFilter(eventFilter01);
  const eventData001 = recursivelyDecodeResult(events001[events001.length - 1].args as unknown as Result);
  console.info("RandomWordsFulfilled", eventData001);

  const eventFilter = itemrInstance.filters.MintRandom();
  const events = await itemrInstance.queryFilter(eventFilter);
  // console.info("events", events);
  const eventData1 = recursivelyDecodeResult(events[events.length - 1].args as unknown as Result);
  console.info("MintRandom", eventData1);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
// hardhat run scripts/chainlink/init-chainlink.ts --network besu && hardhat run scripts/chainlink/sub-chainlink.ts --network besu && npm run prepare:contracts:besu
// && hardhat run scripts/dev/random-call.ts --network besu
// 46743535047904397907744975192256974478360060631460259718233215649634546163919n,
// 21123401895835769597316103241592732199743177860633404198275688025030072992781n,,
