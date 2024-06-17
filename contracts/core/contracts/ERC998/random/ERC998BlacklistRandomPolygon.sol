// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2 } from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

import { ChainLinkPolygonV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkPolygonV2.sol";
import { ChainLinkBaseV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkBaseV2.sol";

import { ERC998BlacklistRandom } from "../ERC998BlacklistRandom.sol";

contract ERC998BlacklistRandomGemunion is ERC998BlacklistRandom, ChainLinkPolygonV2 {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC998BlacklistRandom(name, symbol, royalty, baseTokenURI)
    ChainLinkPolygonV2(uint64(0), uint16(6), uint32(600000), uint32(1))
  {}
  function getRandomNumber() internal override(ChainLinkBaseV2, ERC998BlacklistRandom) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] memory randomWords
  ) internal override(ERC998BlacklistRandom, VRFConsumerBaseV2) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return super._baseURI();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC998BlacklistRandom) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
