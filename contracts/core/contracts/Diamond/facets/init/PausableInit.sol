// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

import {PausableStorage} from "../../storage/PausableStorage.sol";

contract PausableInit {
    function init() public virtual {
        PausableStorage.Layout storage ps = PausableStorage.layout();
        ps._paused = false;
    }
}
