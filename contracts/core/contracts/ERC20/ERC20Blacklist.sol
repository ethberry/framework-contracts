// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {BlackList} from "@gemunion/contracts-access/contracts/extension/BlackList.sol";
import {ERC20AB} from "@gemunion/contracts-erc20/contracts/preset/ERC20AB.sol";

import {ERC20Simple} from "./ERC20Simple.sol";

contract ERC20Blacklist is ERC20Simple, BlackList {
  constructor(string memory name, string memory symbol, uint256 cap) ERC20Simple(name, symbol, cap) {}

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC20AB, BlackList) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {IERC20-_update}.
   */
  function _update(address from, address to, uint256 value) internal virtual override {
    super._update(from, to, value);

    if (from != address(0) && _isBlacklisted(from)) {
      revert BlackListError(from);
    }

    if (to != address(0) && _isBlacklisted(to)) {
      revert BlackListError(to);
    }
  }
}
