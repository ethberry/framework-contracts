// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";

interface IDispenserErrors {
  /**
	 * @dev used when two arrays has to be of the length size but they are not
	 */
  error DispenserWrongArrayLength();
}
