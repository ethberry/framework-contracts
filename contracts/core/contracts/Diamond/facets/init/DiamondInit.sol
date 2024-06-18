// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

import { InitialiseStorage } from "../../storage/InitStorage.sol";
import { DiamondAlreadyInitialised } from "../../../utils/errors.sol";

contract DiamondInit {
    function init() public virtual {
        InitialiseStorage.Layout storage s = InitialiseStorage.layout();
        if(s._initialised) {
            revert DiamondAlreadyInitialised();
        }
        s._initialised = true;
    }
}
