// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

import { ChainLinkEthberryV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkEthberryV2Plus.sol";
import { ChainLinkBaseV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkBaseV2Plus.sol";

import { Lottery } from "../Lottery.sol";
import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";

contract LotteryEthberry is Lottery, ChainLinkEthberryV2Plus {
  constructor(
    LotteryConfig memory config
  ) Lottery(config) ChainLinkEthberryV2Plus(uint16(6), uint32(600000), uint32(1)) {}

  function getRandomNumber() internal override(Lottery, ChainLinkBaseV2Plus) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override(Lottery, VRFConsumerBaseV2Plus) {
    super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, Lottery) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
