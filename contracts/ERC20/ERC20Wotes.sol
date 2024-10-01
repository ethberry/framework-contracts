// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import { ERC20ABC } from "@ethberry/contracts-erc20/contracts/preset/ERC20ABC.sol";

import { ERC20Simple } from "./ERC20Simple.sol";

contract ERC20Wotes is ERC20Simple, ERC20Votes {
  constructor(
    string memory name,
    string memory symbol,
    uint256 cap
  ) ERC20Simple(name, symbol, cap) EIP712(name, "1.0.0") {}

  /**
   * @dev See {ERC20-_update}.
   */
  function _update(address from, address to, uint256 value) internal virtual override(ERC20ABC, ERC20Votes) {
    super._update(from, to, value);
  }
}
