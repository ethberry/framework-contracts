// SPDX-License-Identifier: MIT

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Rarity} from "../Mechanics/Rarity/Rarity.sol";

contract Dispersion is Rarity {
  function getDispersion(uint256 randomness) external pure virtual returns (uint256) {
    return _getDispersion(randomness);
  }
}
