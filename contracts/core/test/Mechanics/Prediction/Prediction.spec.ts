import { expect } from "chai";
import { ethers, network, web3 } from "hardhat";
import {
  encodeBytes32String,
  getUint,
  hexlify,
  parseEther,
  toBeHex,
  toQuantity,
  WeiPerEther,
  ZeroAddress,
} from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { shouldBehaveLikePausable } from "@gemunion/contracts-utils";
import { amount, DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce, PAUSER_ROLE } from "@gemunion/contracts-constants";

import { expiresAt, externalId, extra, params, subscriptionId, tokenId } from "../../constants";
import { deployLinkVrfFixture } from "../../shared/link";
import { VRFCoordinatorV2Mock } from "../../../typechain-types";
import { randomRequest } from "../../shared/randomRequest";
import { deployPrediction } from "./fixture";
import { wrapOneToOneSignature } from "../../Exchange/shared/utils";
import { getBytesNumbersArr, getNumbersBytes, isEqualEventArgObj, recursivelyDecodeResult } from "../../utils";
import { decodeMetadata } from "../../shared/metadata";
import { deployDiamond } from "../../Exchange/shared";

const delay = (milliseconds: number) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

describe.only("Prediction", function () {
  let vrfInstance: VRFCoordinatorV2Mock;

  const lotteryConfig = {
    // timeLagBeforeRelease: 100, // production: release after 2592000 seconds = 30 days
    commission: 30, // lottery wallet gets 30% commission from each round balance
  };

  const factoryDiamond = async () =>
    deployDiamond(
      "DiamondExchange",
      [
        "ExchangeLotteryFacet",
        "PausableFacet",
        "AccessControlFacet",
        "WalletFacet", //
      ],
      "DiamondExchangeInit",
      {
        // log: true,
        logSelectors: false, //
      },
    );

  const factory = () => deployPrediction(lotteryConfig);

  before(async function () {
    if (network.name === "hardhat") {
      await network.provider.send("hardhat_reset");

      // https://github.com/NomicFoundation/hardhat/issues/2980
      ({ vrfInstance } = await loadFixture(function chainlink() {
        return deployLinkVrfFixture();
      }));
    }
  });

  // shouldBehaveLikeAccessControl(async () => {
  //   const { lotteryInstance } = await factory();
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   return lotteryInstance;
  // })(DEFAULT_ADMIN_ROLE, PAUSER_ROLE);

  // shouldBehaveLikePausable(async () => {
  //   const { lotteryInstance } = await factory();
  //   // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //   return lotteryInstance;
  // });

  describe("Start Round", function () {
    it("should start new round", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const { predictionInstance, erc20Instance } = await factory();

      const tx = await predictionInstance.createQuestion(
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount,
        },
        "What Are u doing?",
        0, // maxAnswers
        0, // endTimeStamp
      )

      expect(tx).to.emit(predictionInstance, "QuestionCreated").withArgs(
        isEqualEventArgObj({
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        }),
        0n,
        "What Are u doing?",
        0n, // maxAnswers
        0n, // endTimeStamp
      )

      const tx2 = predictionInstance.placeAnswer(0, 0, owner.address);
      await expect(tx2).to.be.revertedWith("Invalid Answer");

      // Invalid Answer (3) 
      const tx3 = predictionInstance.placeAnswer(0, 3, owner.address);
      await expect(tx3).to.be.revertedWithoutReason();

      const tx4 = predictionInstance.placeAnswer(0, 1, owner.address);
      await expect(tx4).to.emit(predictionInstance, "PlaceAnswer")
        .withArgs(0, 1, owner.address);

      const tx5 = predictionInstance.placeAnswer(0, 2, owner.address);
      await expect(tx5).to.emit(predictionInstance, "PlaceAnswer")
        .withArgs(0, 2, owner.address);

      const tx6 = predictionInstance.placeAnswer(0, 1, receiver.address);
      await expect(tx6).to.emit(predictionInstance, "PlaceAnswer")
        .withArgs(0, 1, receiver.address);

      const tx7 = predictionInstance.finalizeQuestion(0, 1);
      await expect(tx7).to.emit(predictionInstance, "QuestionFinilised")
        .withArgs(0, 1)

      await erc20Instance.mint(await predictionInstance.getAddress(), amount * 3n);
      console.log("MINTED");

      const tx8 = predictionInstance.releaseFunds(0);
      await expect(tx8).to.emit(predictionInstance, "Released")
        .withArgs(0, amount * 3n * 30n / 100n)
      
        const res = await predictionInstance.getQuestionInfo(0);
      console.log(res);


    });

  });
});
