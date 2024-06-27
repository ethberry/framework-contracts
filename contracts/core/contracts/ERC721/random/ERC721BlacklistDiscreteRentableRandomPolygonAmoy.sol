// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

import { ChainLinkPolygonAmoyV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkPolygonAmoyV2.sol";
import { ChainLinkBaseV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBaseV2.sol";

import { ERC721BlacklistDiscreteRentableRandom } from "../ERC721BlacklistDiscreteRentableRandom.sol";

/**
 * @dev An implementation of ERC721BlacklistDiscreteRentableRandom for Binance testnet
 */
contract ERC721BlacklistDiscreteRentableRandomPolygonAmoy is
  ERC721BlacklistDiscreteRentableRandom,
  ChainLinkPolygonAmoyV2
{
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC721BlacklistDiscreteRentableRandom(name, symbol, royalty, baseTokenURI)
    ChainLinkPolygonAmoyV2(uint64(2778), uint16(3), uint32(700000), uint32(1))
  {}
  /**
   * @dev See {ERC721Random-getRandomNumber}.
   */
  function getRandomNumber()
    internal
    override(ChainLinkBaseV2, ERC721BlacklistDiscreteRentableRandom)
    returns (uint256 requestId)
  {
    return super.getRandomNumber();
  }

  /**
   * @dev See {ERC721Random-getRandomNumber}.
   */
  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override(ERC721BlacklistDiscreteRentableRandom, VRFConsumerBaseV2) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721BlacklistDiscreteRentableRandom) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
