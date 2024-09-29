// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset, Params } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { ITokenValidationErrors } from "../../../Exchange/interfaces/ITokenValidationErrors.sol";

interface IStakingErrors {
  error StakingNotAnOwner(address account);
  error StakingRuleNotExist();
  error StakingRuleNotActive();
  error StakingStakeLimitExceed();
  error StakingBalanceExceed();
  error StakingStakeNotExist();
  error StakingStakeAlreadyWithdrawn();
  error StakingZeroBalance();
  error StakingDepositNotComplete();
  error StakingWrongTemplate();
}
