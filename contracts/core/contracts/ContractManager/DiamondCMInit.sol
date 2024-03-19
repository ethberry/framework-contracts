// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {DEFAULT_ADMIN_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {LibDiamond} from "../Diamond/lib/LibDiamond.sol";
import {AccessControlInternal} from "../Diamond/override/AccessControlInternal.sol";

import { AccessControlInit, PausableInit, DiamondInit } from "../Diamond/facets/init/index.sol";

contract DiamondCMInit is Context, DiamondInit, PausableInit, AccessControlInit, AccessControlInternal {

    function init() public override(DiamondInit, PausableInit, AccessControlInit) {
        super.init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
}
