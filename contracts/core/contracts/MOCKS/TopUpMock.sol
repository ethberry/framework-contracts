// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { CoinHolder, NativeReceiver } from "@gemunion/contracts-finance/contracts/Holder.sol";

import { TopUp } from "../utils/TopUp.sol";

contract TopUpMock is CoinHolder, NativeReceiver, TopUp {

}
