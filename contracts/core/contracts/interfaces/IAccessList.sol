// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {IBlackList} from "@gemunion/contracts-access/contracts/extension/interfaces/IBlackList.sol";
import {IWhiteList} from "@gemunion/contracts-access/contracts/extension/interfaces/IWhiteList.sol";

interface IAccessList is IBlackList, IWhiteList {}
