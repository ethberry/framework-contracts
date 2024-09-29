// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract StringHashCalculator {
  function test() public pure {
    console.logBytes32(keccak256("TEMPLATE_ID"));
    console.logBytes32(keccak256("GRADE"));
    console.logBytes32(keccak256("RARITY"));
    console.logBytes32(keccak256("GENES"));
  }
}
