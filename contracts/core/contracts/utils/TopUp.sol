// SPDX-License-Identifier: MIT

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import { ExchangeUtils } from "../Exchange/lib/ExchangeUtils.sol";
import { Asset, AllowedTokenTypes } from "../Exchange/lib/interfaces/IAsset.sol";

contract TopUp is Context {
  /**
   * @dev Allows to top-up the contract with tokens (NATIVE and ERC20 only).
   * @param price An array of Asset representing the tokens to be transferred.
   */
  function topUp(Asset[] memory price) external payable virtual {
    ExchangeUtils.spendFrom(price, _msgSender(), address(this), AllowedTokenTypes(true, true, false, false, false));
  }
}
