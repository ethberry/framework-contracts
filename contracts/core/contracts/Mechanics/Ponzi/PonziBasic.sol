// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

// import {constants} from "../../utils/constants.sol";
import {IPonzi} from "./interfaces/IPonzi.sol";
import {LinearReferralPonzi} from "./LinearReferralPonzi.sol";
import {Asset, TokenType} from "../../Exchange/lib/interfaces/IAsset.sol";

contract PonziBasic is IPonzi, AccessControl, Pausable {
  using Address for address;
  using SafeERC20 for IERC20;

  uint256 internal _ruleIdCounter;
  uint256 internal _stakeIdCounter;

  mapping(uint256 => Rule) internal _rules;
  mapping(uint256 => Stake) internal _stakes;

  event StakingStart(uint256 stakingId, uint256 ruleId, address owner, uint256 startTimestamp, uint256 tokenId);
  event StakingWithdraw(uint256 stakingId, address owner, uint256 withdrawTimestamp);
  event StakingFinish(uint256 stakingId, address owner, uint256 finishTimestamp, uint256 multiplier);
  event WithdrawToken(address token, uint256 amount);
  event FinalizedToken(address token, uint256 amount);

  event PaymentEthReceived(address from, uint256 amount);
  event PaymentEthSent(address to, uint256 amount);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  function setRules(Rule[] memory rules) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _setRules(rules);
  }

  function updateRule(uint256 ruleId, bool active) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _updateRule(ruleId, active);
  }

  function deposit(address, uint256 ruleId, uint256 tokenId) public payable whenNotPaused {
    Rule memory rule = _rules[ruleId];
    require(rule.terms.period != 0, "Ponzi: rule doesn't exist");
    require(rule.active, "Ponzi: rule doesn't active");

    uint256 stakeId = _stakeIdCounter++;

    Asset memory depositItem = Asset(rule.deposit.tokenType, rule.deposit.token, 0, rule.deposit.amount);
    _stakes[stakeId] = Stake(_msgSender(), depositItem, ruleId, block.timestamp, 0, true);

    emit StakingStart(stakeId, ruleId, _msgSender(), block.timestamp, tokenId);

    if (depositItem.tokenType == TokenType.NATIVE) {
      require(msg.value == depositItem.amount, "Ponzi: wrong amount");
      emit PaymentEthReceived(_msgSender(), msg.value);
    } else if (depositItem.tokenType == TokenType.ERC20) {
      IERC20(depositItem.token).safeTransferFrom(_msgSender(), address(this), depositItem.amount);
    } else {
      revert("Ponzi: unsupported token type");
    }

    Asset[] memory depositItems = new Asset[](1);
    depositItems[0] = depositItem;
  }

  function receiveReward(uint256 stakeId, bool withdrawDeposit, bool breakLastPeriod) public virtual whenNotPaused {
    Stake storage stake = _stakes[stakeId];
    Rule memory rule = _rules[stake.ruleId];
    Asset memory depositItem = _stakes[stakeId].deposit;

    require(stake.owner != address(0), "Ponzi: wrong staking id");
    require(stake.owner == _msgSender(), "Ponzi: not an owner");
    require(stake.activeDeposit, "Ponzi: deposit withdrawn already");

    uint256 startTimestamp = stake.startTimestamp;
    uint256 stakePeriod = rule.terms.period;
    uint256 stakeAmount = depositItem.amount;

    address payable receiver = payable(stake.owner);

    if (withdrawDeposit) {
      emit StakingWithdraw(stakeId, receiver, block.timestamp);
      stake.activeDeposit = false;

      // PENALTY
      uint256 withdrawAmount = stakeAmount - (stakeAmount / 100) * (rule.terms.penalty / 100);

      if (depositItem.tokenType == TokenType.NATIVE) {
        Address.sendValue(payable(receiver), withdrawAmount);
        emit PaymentEthSent(receiver, withdrawAmount);
      } else if (depositItem.tokenType == TokenType.ERC20) {
        SafeERC20.safeTransfer(IERC20(depositItem.token), receiver, withdrawAmount);
      }
    } else {
      stake.startTimestamp = block.timestamp;
    }

    uint256 multiplier = _calculateRewardMultiplier(startTimestamp, block.timestamp, stakePeriod);

    // Check cycle count
    uint256 maxCycles = rule.terms.maxCycles;
    // multiplier = (maxCycles > 0) ? (multiplier + cycleCount >= maxCycles) ? (maxCycles - cycleCount): multiplier : multiplier;
    if (maxCycles > 0) {
      uint256 cycleCount = stake.cycles;

      if (multiplier + cycleCount >= maxCycles) {
        multiplier = maxCycles - cycleCount;
      }
    }

    if (multiplier > 0) {
      emit StakingFinish(stakeId, receiver, block.timestamp, multiplier);
      stake.cycles += multiplier;

      Asset memory rewardItem = rule.reward;
      uint256 rewardAmount;

      if (rewardItem.tokenType == TokenType.NATIVE) {
        rewardAmount = rewardItem.amount * multiplier;
        Address.sendValue(payable(receiver), rewardAmount);
      } else if (rewardItem.tokenType == TokenType.ERC20) {
        rewardAmount = rewardItem.amount * multiplier;
        SafeERC20.safeTransfer(IERC20(rewardItem.token), receiver, rewardAmount);
      }
    }
    if (multiplier == 0 && !withdrawDeposit && !breakLastPeriod) {
      revert("Ponzi: first period not yet finished");
    }
  }

  function _calculateRewardMultiplier(
    uint256 startTimestamp,
    uint256 finishTimestamp,
    uint256 period
  ) internal pure virtual returns (uint256) {
    return (finishTimestamp - startTimestamp) / period;
  }

  // RULES
  function _setRules(Rule[] memory rules) internal {
    uint256 length = rules.length;
    for (uint256 i; i < length; ) {
      _setRule(rules[i]);
      unchecked {
        i++;
      }
    }
  }

  function _setRule(Rule memory rule) internal {
    uint256 ruleId = _ruleIdCounter++;
    _rules[ruleId] = rule;
    emit RuleCreatedP(ruleId, rule);
  }

  function _updateRule(uint256 ruleId, bool active) internal {
    Rule memory rule = _rules[ruleId];
    require(rule.terms.period != 0, "Ponzi: rule does not exist");
    _rules[ruleId].active = active;
    emit RuleUpdated(ruleId, active);
  }

  // WITHDRAW
  function withdrawToken(address token, uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 totalBalance;
    if (token == address(0)) {
      totalBalance = address(this).balance;
      require(totalBalance >= amount, "Ponzi: balance exceeded");
      Address.sendValue(payable(_msgSender()), amount);
    } else {
      totalBalance = IERC20(token).balanceOf(address(this));
      require(totalBalance >= amount, "Ponzi: balance exceeded");
      SafeERC20.safeTransfer(IERC20(token), _msgSender(), amount);
    }
    emit WithdrawToken(token, amount);
  }

  // FINALIZE
  function finalizeByToken(address token) public onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 finalBalance;
    if (token == address(0)) {
      finalBalance = address(this).balance;
      require(finalBalance > 0, "Ponzi: 0 balance");
      Address.sendValue(payable(_msgSender()), finalBalance);
    } else {
      finalBalance = IERC20(token).balanceOf(address(this));
      require(finalBalance > 0, "Ponzi: 0 balance");
      SafeERC20.safeTransfer(IERC20(token), _msgSender(), finalBalance);
    }
    emit FinalizedToken(token, finalBalance);
  }

  function finalizeByRuleId(uint256 ruleId) public onlyRole(DEFAULT_ADMIN_ROLE) {
    Rule memory rule = _rules[ruleId];
    require(rule.terms.period != 0, "Ponzi: rule doesn't exist");
    address token = rule.deposit.token;
    uint256 finalBalance;

    if (token == address(0)) {
      finalBalance = address(this).balance;
      require(finalBalance > 0, "Ponzi: 0 balance");
      Address.sendValue(payable(_msgSender()), finalBalance);
    } else {
      finalBalance = IERC20(token).balanceOf(address(this));
      require(finalBalance > 0, "Ponzi: 0 balance");
      SafeERC20.safeTransfer(IERC20(token), _msgSender(), finalBalance);
    }
    emit FinalizedToken(token, finalBalance);
  }

  // USE WITH CAUTION
  function finalize() public onlyRole(DEFAULT_ADMIN_ROLE) {
    // TODO UNCOMMENT
    // selfdestruct(payable(_msgSender()));
  }

  // ETH FUND
  function fundEth() public payable onlyRole(DEFAULT_ADMIN_ROLE) {}

  receive() external payable {
    revert();
  }

  // PAUSE
  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
