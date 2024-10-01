import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { VRFCoordinatorV2PlusMock } from "../../contracts/core";

export async function randomRequest(_rndInstance: any, vrfInstance: VRFCoordinatorV2PlusMock, fix = 32n) {
  const eventFilter = vrfInstance.filters.RandomWordsRequested();
  const events = await vrfInstance.queryFilter(eventFilter);
  for (const e of events) {
    const {
      args: {
        // keyHash,
        requestId,
        // preSeed,
        subId,
        // minimumRequestConfirmations,
        callbackGasLimit,
        numWords,
        extraArgs,
        sender,
      },
    } = e;

    const blockNum = await ethers.provider.getBlockNumber();
    // ATTENTION: 32 is not random, fixed number is needed to test RARITY
    await vrfInstance.fulfillRandomWords(
      // Proof
      {
        pk: [0, 0],
        gamma: [0, 0],
        c: 0,
        s: 0,
        seed: fix, // random number
        uWitness: ZeroAddress,
        cGammaWitness: [0, 0],
        sHashWitness: [0, 0],
        zInv: requestId, // requestId
      },
      // RequestCommitmentV2Plus
      {
        blockNum,
        subId,
        callbackGasLimit,
        numWords,
        sender,
        extraArgs,
      },
      // onlyPremium
      false,
    );
  }
}
