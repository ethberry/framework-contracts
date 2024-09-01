// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

interface ITokenValidationErrors {
	/**
   * @dev used to indicate that certain token types are not allowed for mechanics
	 */
	error UnsupportedTokenType();
}
