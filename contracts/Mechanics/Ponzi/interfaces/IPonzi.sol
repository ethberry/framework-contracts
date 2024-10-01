// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;
import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IPonziErrors } from "./IPonziErrors.sol";

interface IPonzi is IPonziErrors {
  struct RuleTerms {
    uint256 period;
    uint256 penalty;
    uint256 maxCycles;
  }

  struct Rule {
    Asset deposit;
    Asset reward;
    RuleTerms terms;
    bool active;
  }

  struct Stake {
    address owner;
    Asset deposit;
    uint256 ruleId;
    uint256 startTimestamp;
    uint256 cycles;
    bool activeDeposit;
  }

  event RuleCreatedP(uint256 ruleId, Rule rule);
  event RuleUpdated(uint256 ruleId, bool active);
}
