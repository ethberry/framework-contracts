// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IDispenserErrors } from "./IDispenserErrors.sol";

interface IDispenser is IDispenserErrors {
  function disperse(Asset[] memory items, address[] calldata receivers) external payable;
}
