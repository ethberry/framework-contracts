// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { SplitterWallet } from "@ethberry/contracts-finance/contracts/SplitterWallet.sol";

contract GemunionSplitter is SplitterWallet {
  constructor(address[] memory payees, uint256[] memory shares) SplitterWallet (payees, shares) { }
}
