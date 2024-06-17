// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

import { ChainLinkGemunionV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkGemunionV2.sol";
import { ChainLinkBaseV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBaseV2.sol";

import { InvalidSubscription } from "../../utils/errors.sol";
import { ERC721Random } from "../ERC721Random.sol";

contract ERC721RandomGemunion is ERC721Random, ChainLinkGemunionV2 {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC721Random(name, symbol, royalty, baseTokenURI)
    ChainLinkGemunionV2(uint64(0), uint16(6), uint32(600000), uint32(1))
  {}
  function getRandomNumber() internal override(ChainLinkBaseV2, ERC721Random) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override(ERC721Random, VRFConsumerBaseV2) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721Random) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
