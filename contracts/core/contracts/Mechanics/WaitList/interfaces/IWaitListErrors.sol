// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";

interface IWaitListErrors {
	error WaitListAddressAlreadyExists(address account);
	error WaitListRewardAlreadyClaimed();
	error WaitListRootAlreadySet();
	error WaitListMissingRoot();
	error WaitListNoReward();
}
