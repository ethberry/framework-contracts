// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

import { IERC165 } from "../../interfaces/IERC165.sol";

import { LibDiamond } from "../../lib/LibDiamond.sol";

contract LoupeInit {
  function init() public virtual {
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    ds.supportedInterfaces[type(IERC165).interfaceId] = true;
  }
}
