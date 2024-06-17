// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

import { ChainLinkBesuV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBesuV2.sol";
import { ChainLinkBaseV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBaseV2.sol";

import { ERC998Random } from "../ERC998Random.sol";
import { InvalidSubscription } from "../../utils/errors.sol";

contract ERC998RandomBesu is ERC998Random, ChainLinkBesuV2 {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC998Random(name, symbol, royalty, baseTokenURI)
    ChainLinkBesuV2(uint64(0), uint16(6), uint32(600000), uint32(1))
  {}
  function getRandomNumber() internal override(ChainLinkBaseV2, ERC998Random) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override(ERC998Random, VRFConsumerBaseV2) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC998Random) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
