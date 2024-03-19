// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {METADATA_ROLE, PAUSER_ROLE, MINTER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {LibDiamond} from "../Diamond/lib/LibDiamond.sol";
import {AccessControlInternal} from "../Diamond/override/AccessControlInternal.sol";
import { AccessControlInit, DiamondInit, PausableInit, WalletInit } from "../Diamond/facets/init/index.sol";

contract DiamondExchangeInit is Context, DiamondInit, AccessControlInit, PausableInit, WalletInit, AccessControlInternal {

    function init() public override(DiamondInit, AccessControlInit, PausableInit, WalletInit) {
        super.init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(METADATA_ROLE, _msgSender());
    }
}
