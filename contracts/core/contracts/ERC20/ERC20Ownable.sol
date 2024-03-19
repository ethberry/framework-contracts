// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC20OBC} from "@gemunion/contracts-erc20/contracts/preset/ERC20OBC.sol";

contract ERC20Ownable is ERC20OBC {
  constructor(string memory name, string memory symbol, uint256 cap) ERC20OBC(name, symbol, cap) {}

  receive() external payable {
    revert();
  }
}
