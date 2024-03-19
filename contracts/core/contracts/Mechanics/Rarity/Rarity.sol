// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

contract Rarity {
  function _getDispersion(uint256 randomness) internal pure virtual returns (uint256) {
    uint256 percent = (randomness % 100) + 1;
    if (percent <= 1) {
      return 5;
    } else if (percent <= 1 + 3) {
      return 4;
    } else if (percent <= 1 + 3 + 8) {
      return 3;
    } else if (percent <= 1 + 3 + 8 + 20) {
      return 2;
    }

    // common
    return 1;
  }
}
