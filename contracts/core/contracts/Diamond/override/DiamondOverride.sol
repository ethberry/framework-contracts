// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControlInternal } from "./AccessControlInternal.sol";
import { PausableInternal } from "./PausableInternal.sol";
import { Referral } from "../../Referral/Referral.sol";


abstract contract DiamondOverride is AccessControlInternal, PausableInternal, Referral  {
}
