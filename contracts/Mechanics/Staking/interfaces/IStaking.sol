// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset, Params } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { ITokenValidationErrors } from "../../../Exchange/interfaces/ITokenValidationErrors.sol";
import { IStakingErrors } from "./IStakingErrors.sol";

interface IStaking is IStakingErrors, ITokenValidationErrors {
  // TODO move period, penalty, maxStake? to StakingTerms
  struct StakingTerms {
    uint256 penalty;
    uint256 period;
    uint256 maxStake;
    bool recurrent;
    bool advance;
  }

  struct Rule {
    Asset[] deposit;
    Asset[] reward;
    Asset[][] content;
    StakingTerms terms;
    bool active;
  }

  struct Stake {
    address owner;
    Asset[] deposit;
    uint256 ruleId;
    uint256 startTimestamp;
    uint256 cycles;
    bool activeDeposit;
  }

  function deposit(Params memory params, uint256[] calldata tokenIds) external payable;

  function receiveReward(uint256 stakeId, bool withdrawDeposit, bool breakLastPeriod) external;

  function withdrawBalance(Asset memory item) external;
}