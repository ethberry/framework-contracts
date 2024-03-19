// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {ERC721MysteryBoxBlacklist} from "./ERC721MysteryBoxBlacklist.sol";

contract ERC721MysteryBoxBlacklistPausable is ERC721MysteryBoxBlacklist, Pausable {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721MysteryBoxBlacklist(name, symbol, royalty, baseTokenURI) {
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
