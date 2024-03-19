// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {WhiteList} from "@gemunion/contracts-access/contracts/extension/WhiteList.sol";
import {ERC20AB} from "@gemunion/contracts-erc20/contracts/preset/ERC20AB.sol";

import {ERC20Simple} from "./ERC20Simple.sol";

contract ERC20Whitelist is ERC20Simple, WhiteList {
  constructor(string memory name, string memory symbol, uint256 cap) ERC20Simple(name, symbol, cap) {}

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC20AB, WhiteList) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {ERC20-_update}.
   */
  function _update(address from, address to, uint256 value) internal virtual override {
    super._update(from, to, value);

    if (from != address(0) && !_isWhitelisted(from)) {
      revert WhiteListError(from);
    }

    if (to != address(0) && !_isWhitelisted(to)) {
      revert WhiteListError(to);
    }
  }
}
