// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

import { ChainLinkPolygonAmoyV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkPolygonAmoyV2Plus.sol";
import { ChainLinkBaseV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkBaseV2Plus.sol";

import { ERC721BlacklistRandom } from "../ERC721BlacklistRandom.sol";

contract ERC721BlacklistRandomPolygonAmoy is ERC721BlacklistRandom, ChainLinkPolygonAmoyV2Plus {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC721BlacklistRandom(name, symbol, royalty, baseTokenURI)
    ChainLinkPolygonAmoyV2Plus(uint16(6), uint32(600000), uint32(1))
  {}

  function getRandomNumber() internal override(ChainLinkBaseV2Plus, ERC721BlacklistRandom) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override(ERC721BlacklistRandom, VRFConsumerBaseV2Plus) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721BlacklistRandom) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}