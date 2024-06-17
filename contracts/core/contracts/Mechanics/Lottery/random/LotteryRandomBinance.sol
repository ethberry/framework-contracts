// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

import { ChainLinkBinanceV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBinanceV2.sol";
import { ChainLinkBaseV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBaseV2.sol";

import { LotteryRandom } from "../LotteryRandom.sol";
import { LotteryConfig } from "../interfaces/ILottery.sol";

contract LotteryRandomBinance is LotteryRandom, ChainLinkBinanceV2 {
  constructor(
    LotteryConfig memory config
  ) LotteryRandom(config) ChainLinkBinanceV2(uint64(0), uint16(6), uint32(600000), uint32(1)) {}

  function getRandomNumber() internal override(LotteryRandom, ChainLinkBaseV2) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override(LotteryRandom, VRFConsumerBaseV2) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, LotteryRandom) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
