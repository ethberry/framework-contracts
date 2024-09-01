// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

interface IGenesErrors {
	error GenesPregnancyCountLimitExceed();
	error GenesPregnancyTimeLimitExceed();
	error GenesNotOwnerNorApproved(address account);
}
