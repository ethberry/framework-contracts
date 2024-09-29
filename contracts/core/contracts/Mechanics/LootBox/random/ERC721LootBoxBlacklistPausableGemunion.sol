// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

import { ChainLinkGemunionV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkGemunionV2Plus.sol";
import { ChainLinkBaseV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkBaseV2Plus.sol";

import { ERC721LootBoxBlacklistPausable } from "../ERC721LootBoxBlacklistPausable.sol";
import { ERC721LootBoxSimple } from "../ERC721LootBoxSimple.sol";
import { ERC721LootBoxBlacklist } from "../ERC721LootBoxBlacklist.sol";

contract ERC721LootBoxBlacklistPausableGemunion is ERC721LootBoxBlacklistPausable, ChainLinkGemunionV2Plus {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC721LootBoxBlacklistPausable(name, symbol, royalty, baseTokenURI)
    ChainLinkGemunionV2Plus(uint16(6), uint32(600000), uint32(1))
  {}

  function getRandomNumber() internal override(ChainLinkBaseV2Plus, ERC721LootBoxSimple) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override(ERC721LootBoxSimple, VRFConsumerBaseV2Plus) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721LootBoxBlacklist) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
