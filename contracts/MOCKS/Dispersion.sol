// SPDX-License-Identifier: MIT

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Rarity } from "../Mechanics/Random/Rarity.sol";

contract Dispersion is Rarity {
  function getDispersion(uint256 randomness) external pure virtual returns (uint256) {
    return _getDispersion(randomness);
  }
}
