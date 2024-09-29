// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControlInternal } from "./AccessControlInternal.sol";
import { PausableInternal } from "./PausableInternal.sol";

abstract contract DiamondOverride is AccessControlInternal, PausableInternal  {
}
