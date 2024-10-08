// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.0;

interface IGenesErrors {
  error PregnancyThresholdExceeded(uint256 counter, uint256 max);
  error PregnancyFrequencyExceeded(uint256 current, uint256 limit);
  error GenesDifferentContracts();
}
