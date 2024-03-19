// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC20ABC} from "@gemunion/contracts-erc20/contracts/preset/ERC20ABC.sol";

contract ERC20Simple is ERC20ABC {
  constructor(string memory name, string memory symbol, uint256 cap) ERC20ABC(name, symbol, cap) {}

  receive() external payable {
    revert();
  }
}
