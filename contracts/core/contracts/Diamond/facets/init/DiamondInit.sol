// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

import {InitialiseStorage} from "../../storage/InitStorage.sol";

contract DiamondInit {
    function init() public virtual {
        InitialiseStorage.Layout storage s = InitialiseStorage.layout();
        require(!s._initialised, "DiamondInit already initialised");
        s._initialised = true;
    }
}
