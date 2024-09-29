// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.0;

import { InitialiseStorage } from "../../storage/InitStorage.sol";
import { IDiamondInitErrors } from "../../interfaces/IDiamondInitErrors.sol";

contract DiamondInit is IDiamondInitErrors {
    function init() public virtual {
        InitialiseStorage.Layout storage s = InitialiseStorage.layout();
        if(s._initialised) {
            revert DiamondAlreadyInitialised();
        }
        s._initialised = true;
    }
}
