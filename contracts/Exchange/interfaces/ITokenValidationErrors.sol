// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.0;

interface ITokenValidationErrors {
  /**
   * @dev used to indicate that certain token types are not allowed for mechanics
   */
  error UnsupportedTokenType();

  /**
   * @dev used to indicate that token does not support certain feature
   */
  error UnsupportedFeature();
}
