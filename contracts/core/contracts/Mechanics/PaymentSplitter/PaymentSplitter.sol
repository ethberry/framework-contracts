// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SplitterWallet } from "@gemunion/contracts-finance/contracts/SplitterWallet.sol";

contract GemunionSplitter is SplitterWallet {
  constructor(address[] memory payees, uint256[] memory shares) SplitterWallet (payees, shares) { }
}
