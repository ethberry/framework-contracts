// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Diamond} from "../Diamond/Diamond.sol";
import {LibDiamond} from "../Diamond/lib/LibDiamond.sol";
import {AccessControlInternal} from "../Diamond/override/AccessControlInternal.sol";

/**
 * todo create contract WalletDiamond. It have to be inherited by this contract.
 */
contract DiamondExchange is Diamond, AccessControlInternal {
  constructor(address _contractOwner, address _diamondCutFacet) payable Diamond(_contractOwner, _diamondCutFacet) {
    // LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    // Can initialise some storage values here if needed.
  }
}
