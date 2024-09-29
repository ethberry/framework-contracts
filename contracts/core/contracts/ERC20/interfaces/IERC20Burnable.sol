// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

interface IERC20Burnable {
  function burn(uint256 value) external;
  function burnFrom(address account, uint256 value) external;
}
