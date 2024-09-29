// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.0;

interface IGenesErrors {
	error GenesPregnancyCountLimitExceed();
	error GenesPregnancyTimeLimitExceed();
	error GenesNotOwnerNorApproved(address account);
}
