// SPDX-License-Identifier: UNLICENSED

/**
 *Submitted for verification at BscScan.com on 2020-09-14
 */

pragma solidity ^0.8.20;

import {Asset} from "../../../Exchange/lib/interfaces/IAsset.sol";

interface IDispenser {
  function disperse(Asset[] memory items, address[] calldata receivers) external payable;
}
