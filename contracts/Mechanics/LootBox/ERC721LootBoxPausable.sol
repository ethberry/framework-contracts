// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { PAUSER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { ERC721LootBoxSimple } from "./ERC721LootBoxSimple.sol";

abstract contract ERC721LootBoxPausable is ERC721LootBoxSimple, Pausable {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721LootBoxSimple(name, symbol, royalty, baseTokenURI) {
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  function unpack(uint256 tokenId) public override whenNotPaused {
    super.unpack(tokenId);
  }
}
