// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { IBlackList } from "@ethberry/contracts-access/contracts/extension/interfaces/IBlackList.sol";
import { IWhiteList } from "@ethberry/contracts-access/contracts/extension/interfaces/IWhiteList.sol";

interface IAccessList is IBlackList, IWhiteList {}
