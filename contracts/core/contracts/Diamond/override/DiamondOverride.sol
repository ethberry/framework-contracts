// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import "./AccessControlInternal.sol";
import "./PausableInternal.sol";
import "../../Referral/Referral.sol";


abstract contract DiamondOverride is AccessControlInternal, PausableInternal, Referral  {
}
