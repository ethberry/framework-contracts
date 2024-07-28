// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { EnumerableMap } from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { AllTypesHolder, NativeRejector } from "@gemunion/contracts-finance/contracts/Holder.sol";
import { PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { TEMPLATE_ID } from "@gemunion/contracts-utils/contracts/attributes.sol";
import { IERC721GeneralizedCollection } from "@gemunion/contracts-erc721/contracts/interfaces/IERC721GeneralizedCollection.sol";

import { IERC721Random } from "../../ERC721/interfaces/IERC721Random.sol";
import { IERC721Simple } from "../../ERC721/interfaces/IERC721Simple.sol";
import { IERC1155Simple } from "../../ERC1155/interfaces/IERC1155Simple.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IERC721_MYSTERY_ID } from "../../utils/interfaces.sol";
import { TopUp } from "../../utils/TopUp.sol";
import { ZeroBalance, NotExist, WrongRule, UnsupportedTokenType, NotComplete, Expired, NotAnOwner, WrongStake, WrongToken, LimitExceed, NotActive } from "../../utils/errors.sol";
import { IERC721MysteryBox } from "../MysteryBox/interfaces/IERC721MysteryBox.sol";
import { IStaking } from "./interfaces/IStaking.sol";
import { Asset,Params,TokenType,AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

/**
 * @dev This contract implements a staking system where users can stake their tokens for a specific period of time
 * and receive rewards based on a set of predefined rules. Users can stake multiple times, and each stake creates a
 * new deposit with a unique stake ID. The rewards can be paid out in NATIVE, ERC20, ERC721, ERC998, or ERC1155 tokens.
 * The contract owner can set and update the rules for the staking system, as well as deposit and withdraw funds.
 * The staking contract is pausable in case of emergency situations or for maintenance purposes.
 */
contract Staking is IStaking, AccessControl, Pausable, AllTypesHolder, NativeRejector, TopUp, Referral, ReentrancyGuard {
  using Address for address;
  using EnumerableMap for EnumerableMap.AddressToUintMap;
  using EnumerableMap for EnumerableMap.UintToUintMap;

  uint256 internal _ruleIdCounter;
  uint256 internal _stakeIdCounter;

  EnumerableMap.AddressToUintMap internal _depositBalancesMap;
  EnumerableMap.AddressToUintMap internal _walletStakeCounterMap;
  EnumerableMap.UintToUintMap internal _stakeRuleCounterMap;

  mapping(uint256 => Rule) internal _rules;
  mapping(uint256 => Stake) internal _stakes;

  mapping(address /* contract */ => mapping(uint256 /* tokenId */ => uint256 /* amount */)) internal _penalties;

  //  mapping(address => uint256) internal _stakeCounter;
  mapping(address => EnumerableMap.UintToUintMap) internal _stakeCounter;

  AllowedTokenTypes _allowedTypes = AllowedTokenTypes(true, true, true, true, true);

  event RuleCreated(uint256 ruleId, Rule rule);
  event RuleUpdated(uint256 ruleId, bool active);
  event DepositStart(uint256 stakingId, uint256 ruleId, address owner, uint256 startTimestamp, uint256[] tokenIds);
  event DepositWithdraw(uint256 stakingId, address owner, uint256 withdrawTimestamp);
  event DepositFinish(uint256 stakingId, address owner, uint256 finishTimestamp, uint256 multiplier);
  event DepositReturn(uint256 stakingId, address owner);
  event BalanceWithdraw(address owner, Asset item);
  event DepositPenalty(uint256 stakingId, Asset item);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Deposit function allows a user to stake a specified token with a given rule.
   * @param params Struct of Params that containing the ruleId and referrer parameters.
   * @param tokenIds - Array<id> of the tokens to be deposited.
   */
  function deposit(Params memory params, uint256[] calldata tokenIds) public payable whenNotPaused {
    // Retrieve the rule params.
    uint256 ruleId = params.externalId;
    address referrer = params.referrer;

    // Retrieve the rule associated with the given rule ID.
    Rule storage rule = _rules[ruleId];

    // Ensure that the rule exists and is active
    if (rule.terms.period == 0) {
      revert NotExist();
    }
    if (!rule.active) {
      revert NotActive();
    }

    uint256 _maxStake = rule.terms.maxStake;

    (, uint256 _stakeRuleCounter) = _stakeCounter[_msgSender()].tryGet(ruleId);

    // check if user reached the maximum number of stakes, if it is revert transaction.
    if (_maxStake > 0) {
      if (_stakeRuleCounter >= _maxStake) {
        revert LimitExceed();
      }
    }

    // Increment counters and set a new stake.
    uint256 stakeId = ++_stakeIdCounter;
    _stakeCounter[_msgSender()].set(ruleId, _stakeRuleCounter + 1);
    (, uint256 _walletStakeCounter) = _walletStakeCounterMap.tryGet(_msgSender());
    _walletStakeCounterMap.set(_msgSender(), _walletStakeCounter + 1);

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _stakes[stakeId] = Stake(_msgSender(), rule.deposit, ruleId, block.timestamp, 0, true);

    // Store the new stake in the _stakes mapping.
    _stakes[stakeId].owner = _msgSender();
    _stakes[stakeId].ruleId = ruleId;
    _stakes[stakeId].startTimestamp = block.timestamp;
    _stakes[stakeId].cycles = 0;
    _stakes[stakeId].activeDeposit = true;

    emit DepositStart(stakeId, ruleId, _msgSender(), block.timestamp, tokenIds);

    uint256 length = rule.deposit.length;
    if (length > 0) {
      for (uint256 i = 0; i < length; ) {
        // Create a new Asset object representing the deposit.
        Asset memory depositItem = Asset(
          rule.deposit[i].tokenType,
          rule.deposit[i].token,
          tokenIds[i],
          rule.deposit[i].amount
        );

        _stakes[stakeId].deposit.push(depositItem);

        // Check templateId if ERC721 or ERC998
        if (depositItem.tokenType == TokenType.ERC721 || depositItem.tokenType == TokenType.ERC998) {
          // Rule deposit tokenId
          uint256 ruleDepositTokenTemplateId = rule.deposit[i].tokenId;

          if (ruleDepositTokenTemplateId != 0) {
            uint256 templateId = IERC721GeneralizedCollection(depositItem.token).getRecordFieldValue(
              tokenIds[i],
              TEMPLATE_ID
            );
            if (templateId != ruleDepositTokenTemplateId) {
              revert WrongToken();
            }
          }
        }

        // Transfer tokens from user to this contract.
        ExchangeUtils.spendFrom(ExchangeUtils._toArray(depositItem), _msgSender(), address(this), _allowedTypes);
        // Save deposit balance
        (, uint256 balance) = _depositBalancesMap.tryGet(depositItem.token);
        _depositBalancesMap.set(depositItem.token, balance + depositItem.amount);

        unchecked {
          i++;
        }
      }
      // Do something with referrer
      _afterPurchase(referrer, _stakes[stakeId].deposit);
    }

    // ADVANCE REWARD
    if (rule.terms.advance) {
      receiveReward(stakeId, false, false);
    }
  }

  /* Receive Staking Reward logic:

    1. Calculate multiplier (count full periods since stake start)

    2. Deposit withdraw
      2.1 If withdrawDeposit || ( multiplier > 0 && !rule.terms.recurrent ) || ( stake.cycles > 0 && breakLastPeriod )

        2.1.1 If multiplier == 0                       -> deduct penalty from deposit amount
        2.1.2 Transfer deposit to user account         -> spend(_toArray(depositItem), receiver)

      2.2 Else -> update stake.startTimestamp = block.timestamp

    3. Reward transfer
      3.1 If multiplier > 0                            -> transfer reward amount * multiplier to receiver

    4. If multiplier == 0 && rule.terms.recurrent && !withdrawDeposit && !breakLastPeriod
                                                       -> revert with Error ( first period not yet finished )
    */

  /**
   * @dev Allows the owner of the specified stake to receive the reward.
   * @param stakeId The ID of the stake.
   * @param withdrawDeposit Flag indicating whether the deposit should be withdrawn or not.
   * @param breakLastPeriod Flag indicating whether the last period should be broken or not.
   */
  function receiveReward(
    uint256 stakeId,
    bool withdrawDeposit,
    bool breakLastPeriod
  ) public virtual nonReentrant whenNotPaused {
    // Retrieve the stake and rule objects from storage.
    Stake storage stake = _stakes[stakeId];
    Rule storage rule = _rules[stake.ruleId];

    uint256 startTimestamp = stake.startTimestamp;
    // Set the receiver of the reward.
    address payable receiver = payable(stake.owner);

    // Verify that the stake exists and the caller is the owner of the stake.
    if (stake.owner == address(0)) {
      revert WrongStake();
    }
    if (stake.owner != _msgSender()) {
      revert NotAnOwner();
    }
    if (!stake.activeDeposit) {
      revert Expired();
    }

    uint256 stakePeriod = rule.terms.period;

    // Determine if it is first advance payment
    bool firstAdvancePayment = rule.terms.advance && stake.cycles == 0;
    // Calculate the multiplier
    // counts only FULL stake cycles
    uint256 multiplier = _calculateRewardMultiplier(startTimestamp, block.timestamp, stakePeriod, stake.cycles, rule.terms.recurrent, rule.terms.advance);
    // Increment stake's cycle count
    if (multiplier != 0) {
      stake.cycles += multiplier;
    }

    // WITHDRAW INITIAL DEPOSIT
    // if withdrawDeposit flag is true OR
    // if Reward multiplier > 0 AND Rule is not recurrent OR
    // if Stake cycles > 0 AND breakLastPeriod flag is true
    if (withdrawDeposit || (multiplier > 0 && !rule.terms.recurrent) || (stake.cycles > 0 && breakLastPeriod)) {
      // Deactivate current deposit
      if (stake.activeDeposit) {
        stake.activeDeposit = false;
      }

      emit DepositWithdraw(stakeId, receiver, block.timestamp);

      // Iterate by Array<deposit>
      uint256 lengthDeposit = stake.deposit.length;
      for (uint256 i = 0; i < lengthDeposit; ) {
        withdrawDepositItem(stakeId, i, multiplier, receiver);

      unchecked {
        i++;
      }
      }

    } else {

      // Update the start timestamp of the stake
      // if multiplier > 0 AND
      // if it is not first Advance Payment
      if (!firstAdvancePayment && multiplier > 0){
        stake.startTimestamp = block.timestamp;
      }
    }

    // If the multiplier is not zero, it means that the staking period has ended and rewards can be issued.
    if (multiplier > 0) {
      // Emit an event indicating that staking has finished.
      emit DepositFinish(stakeId, receiver, block.timestamp, multiplier);

      // Iterate by Array<reward>
      uint256 lengthReward = rule.reward.length;
      for (uint256 j = 0; j < lengthReward; ) {
        // Transfer the reward.
        withdrawRewardItem(stakeId, j, multiplier, receiver);

        unchecked {
          j++;
        }
      }
    }

    // REVERT THE TRANSACTION
    // IF the multiplier is zero
    // AND
    // withdrawDeposit and breakLastPeriod flags are false
    // AND staking rule is recurrent
    if (multiplier == 0 && rule.terms.recurrent && !withdrawDeposit && !breakLastPeriod) {
      revert NotComplete();
    }
  }

  /**
   * @dev Withdraw Deposit Item.
   * @param stakeId The ID of the stake.
   * @param itemIndex The Index of the Deposit Item.
   * @param multiplier The full stake cycles count.
   * @param receiver The Deposit's receiver.
   */
  function withdrawDepositItem(uint256 stakeId, uint256 itemIndex, uint256 multiplier, address receiver) internal {
    // Retrieve the stake objects from storage.
    Stake storage stake = _stakes[stakeId];
    Rule storage rule = _rules[stake.ruleId];
    Asset storage depositItem = stake.deposit[itemIndex];
    uint256 stakeAmount = depositItem.amount;
    TokenType depositTokenType = depositItem.tokenType;
    uint256 penalty = rule.terms.penalty;

    // Deduct the penalty from the stake deposit amount if the multiplier is 0.
    if (multiplier == 0 && stake.cycles == 0) {
      uint256 penaltyDeposit = (stakeAmount / 100) * (penalty / 100);

      if (penaltyDeposit > 0) {
        depositItem.amount = stakeAmount - penaltyDeposit;
        // Store penalties
        setPenalty(stakeId, Asset(depositItem.tokenType, depositItem.token, depositItem.tokenId, penaltyDeposit));
        // _penalties[depositItem.token][depositItem.tokenId] += penaltyDeposit;
        // Update deposit balance
        if (depositTokenType == TokenType.ERC20 || depositTokenType == TokenType.NATIVE) {
          // Deduct deposit balance
          (, uint256 balance) = _depositBalancesMap.tryGet(depositItem.token);
          _depositBalancesMap.set(depositItem.token, balance - penaltyDeposit);
        }
      }
    }

    // Penalty for ERC721\ERC998 deposit either 0% or 100%
    if (
      multiplier == 0 &&
      penalty == 10000 &&
      (depositTokenType == TokenType.ERC721 || depositTokenType == TokenType.ERC998)
    ) {
      // Empty current stake deposit item amount
      depositItem.amount = 0;
      // Set penalty amount
      setPenalty(stakeId, Asset(depositItem.tokenType, depositItem.token, depositItem.tokenId, 1));
      // _penalties[depositItem.token][depositItem.tokenId] = 1;
    } else {
      if (depositItem.amount > 0) {
        Asset memory depositItemWithdraw = depositItem;
        // Empty current stake deposit storage
        depositItem.amount = 0;
        // Transfer the deposit Asset to the receiver.
        ExchangeUtils.spend(ExchangeUtils._toArray(depositItemWithdraw), receiver, _allowedTypes);

        if (depositTokenType == TokenType.ERC20 || depositTokenType == TokenType.NATIVE) {
          // Deduct deposit balance
          (, uint256 balance) = _depositBalancesMap.tryGet(depositItemWithdraw.token);
          _depositBalancesMap.set(depositItemWithdraw.token, balance - depositItemWithdraw.amount);
        }
      }
    }
  }

  /**
   * @dev Withdraw Reward Item.
   * @param stakeId The ID of the stake.
   * @param itemIndex The Index of the Reward Item.
   * @param multiplier The full stake cycles count.
   * @param receiver The Deposit's receiver.
   */
  function withdrawRewardItem(uint256 stakeId, uint256 itemIndex, uint256 multiplier, address receiver) internal {
    // Retrieve the stake and rule objects from storage.
    Stake storage stake = _stakes[stakeId];
    Rule storage rule = _rules[stake.ruleId];
    Asset storage reward = rule.reward[itemIndex];

    // Create a new Asset object representing the reward.
    Asset memory rewardItem = Asset(
      reward.tokenType,
      reward.token,
      reward.tokenId,
      reward.amount * multiplier // Multiply the reward amount by the multiplier to calculate the total reward.
    );

    // Determine the token type of the reward and transfer the reward accordingly.
    if (rewardItem.tokenType == TokenType.ERC20 || rewardItem.tokenType == TokenType.NATIVE) {
      // If the token is an ERC20 or NATIVE token, transfer tokens to the receiver.

      // Check contract balance
      bool balanceCheck = checkBalance(rewardItem);
      // If contract balance is enough - transfer reward
      if (balanceCheck) {
        ExchangeUtils.spend(ExchangeUtils._toArray(rewardItem), receiver, _allowedTypes);
      } else {
        // If contract balance is not enough for reward - emergency return deposit to receiver
        returnDeposit(stakeId, receiver);
      }
    } else if (rewardItem.tokenType == TokenType.ERC721 || rewardItem.tokenType == TokenType.ERC998) {
      // If the token is an ERC721 or ERC998 token, mint NFT to the receiver.
        if (IERC165(rewardItem.token).supportsInterface(IERC721_MYSTERY_ID)) {
          // If the token supports the Mysterybox interface, call the mintBox function to mint the tokens and transfer them to the receiver.
          for (uint256 k = 0; k < multiplier;) {
            IERC721MysteryBox(rewardItem.token).mintBox(receiver, rewardItem.tokenId, rule.content[itemIndex]);
            unchecked {
              k++;
            }
          }
        } else {
          // If the token does not support the Mysterybox interface, call the acquire function to mint NFTs to the receiver.
          ExchangeUtils.acquire(ExchangeUtils._toArray(rewardItem), receiver, _allowedTypes);
        }
    } else if (rewardItem.tokenType == TokenType.ERC1155) {
      // If the token is an ERC1155 token, call the acquire function to transfer the tokens to the receiver.
      ExchangeUtils.acquire(ExchangeUtils._toArray(rewardItem), receiver, _allowedTypes);
    } else {
      // should never happen
      revert UnsupportedTokenType();
    }
  }

  /**
   * @dev Return entire Deposit without penalty.
   * @param stakeId The ID of the stake.
   * @param receiver The Deposit's receiver.
   */
  function returnDeposit(uint256 stakeId, address receiver) internal {
    emit DepositReturn(stakeId, receiver);

    // Retrieve the stake and rule objects from storage.
    Stake storage stake = _stakes[stakeId];
    Asset[] storage stakeDeposit = stake.deposit;

    emit DepositWithdraw(stakeId, receiver, block.timestamp);
    // Deactivate current deposit
    stake.activeDeposit = false;

    // Iterate by Array<deposit>
    uint256 lengthDeposit = stakeDeposit.length;

    for (uint256 m = 0; m < lengthDeposit; ) {
      Asset storage depositItem = stakeDeposit[m];

      if (depositItem.amount > 0) {
        Asset memory depositItemWithdraw = depositItem;
        // Empty current stake deposit storage
        depositItem.amount = 0;
        // Transfer the deposit Asset to the receiver.
        ExchangeUtils.spend(ExchangeUtils._toArray(depositItemWithdraw), receiver, _allowedTypes);
        if (depositItem.tokenType == TokenType.ERC20 || depositItem.tokenType == TokenType.NATIVE) {
          // Deduct deposit balance
          (, uint256 balance) = _depositBalancesMap.tryGet(depositItemWithdraw.token);
          _depositBalancesMap.set(depositItemWithdraw.token, balance - depositItemWithdraw.amount);
        }
      }
      unchecked {
        m++;
      }
    }
  }

  /**
   * @dev Check contract and deposit balance.
   * @param rewardItem The Reward item.
   * @return bool True if balance is enough.
   */
  function checkBalance(Asset memory rewardItem) internal view returns (bool) {
    // Get deposit balance
    (, uint256 depositBalance) = _depositBalancesMap.tryGet(rewardItem.token);
    // Get contract balance
    uint256 contractBalance = rewardItem.tokenType == TokenType.NATIVE
      ? address(this).balance
      : IERC20(rewardItem.token).balanceOf(address(this));

    return rewardItem.amount <= contractBalance - depositBalance;
  }

  /**
   * @dev Calculates the reward multiplier based on the duration of the staking period and the period length.
   * @param startTimestamp The start timestamp of the staking period.
   * @param finishTimestamp The finish timestamp of the staking period.
   * @param period The length of each staking period in seconds.
   * @return uint256 The reward multiplier, which is the number of periods completed during the staking period.
   */
  function _calculateRewardMultiplier(
    uint256 startTimestamp,
    uint256 finishTimestamp,
    uint256 period,
    uint256 cycles,
    bool recurrent,
    bool advance
  ) internal pure virtual returns (uint256) {
    if (startTimestamp <= finishTimestamp) {
      uint256 multiplier = (finishTimestamp - startTimestamp) / period;
      // If a staking rule is not recurrent, limit reward to 1 cycle
      if (!recurrent && multiplier > 1) {
        return 1;
      }
      // If a staking term is an advance payment, set multiplier to 1
      if (advance && cycles == 0) {
        return 1;
      }
      return multiplier;
    } else return 0;
  }

  /**
   * @dev Sets the staking rules.
   */
  function setRules(Rule[] memory rules) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _setRules(rules);
  }

  /**
   * @dev Updates the active state of a staking rule
   */
  function updateRule(uint256 ruleId, bool active) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _updateRule(ruleId, active);
  }

  /**
   * @dev Sets the staking rules for the contract.
   * @param rules An array of `Rule` structs defining the staking rules.
   */
  function _setRules(Rule[] memory rules) internal {
    uint256 length = rules.length;
    for (uint256 i; i < length; ) {
      _setRule(rules[i]);
      unchecked {
        i++;
      }
    }
  }

  /**
   * @dev Add a new staking rule for the contract.
   * @param rule The staking rule to store.
   */
  function _setRule(Rule memory rule) internal {
    uint256 ruleId = ++_ruleIdCounter;

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _rules[ruleId] = rule

    // Store each individual property of the rule in storage
    Rule storage p = _rules[ruleId];

    // p.deposit = rule.deposit;
    // Store each individual asset in the rule's deposit array
    uint256 lengthDeposit = rule.deposit.length;
    if (lengthDeposit == 0) {
      revert WrongRule();
    }
    for (uint256 i = 0; i < lengthDeposit; ) {
      p.deposit.push(rule.deposit[i]);
      unchecked {
        i++;
      }
    }
    // p.reward = rule.reward;
    // Store each individual asset in the rule's deposit array
    uint256 lengthReward = rule.reward.length;
    for (uint256 j = 0; j < lengthReward; ) {
      p.reward.push(rule.reward[j]);
      unchecked {
        j++;
      }
    }

    // p.content = rule.content;
    // Store each individual asset in the rule's content array
    uint256 len = rule.content.length;
    for (uint256 k = 0; k < len; ) {
      p.content.push();
      uint256 length = rule.content[k].length;
      for (uint256 l = 0; l < length; ) {
        p.content[k].push(rule.content[k][l]);
        unchecked {
          l++;
        }
      }
      unchecked {
        k++;
      }
    }

    p.terms = rule.terms;
    p.active = rule.active;

    emit RuleCreated(ruleId, rule);
  }

  /**
   * @dev Updates the active state of a specific staking rule for the contract.
   * @param ruleId The ID of the rule to update.
   * @param active The new active state of the rule.
   */
  function _updateRule(uint256 ruleId, bool active) internal {
    Rule storage rule = _rules[ruleId];
    if (rule.terms.period == 0) {
      revert NotExist();
    }
    _rules[ruleId].active = active;
    emit RuleUpdated(ruleId, active);
  }

  /**
   * @dev Get Stake
   */
  function getStake(uint256 stakeId) public view returns (Stake memory stake) {
    return _stakes[stakeId];
  }

  /**
   * @dev Get Rule Stake Counter
   */
  function getCounters(
    address account,
    uint256 ruleId
  ) public view returns (uint256 allUsers, uint256 allStakes, uint256 userStakes, uint256 ruleCounter) {
    // All users who ever staked
    allUsers = _walletStakeCounterMap.length();
    // Total number of stakes
    allStakes = _stakeIdCounter;
    // User stake counter
    (, userStakes) = _walletStakeCounterMap.tryGet(account);
    // User stake counter for given rule
    (, ruleCounter) = _stakeCounter[account].tryGet(ruleId);
  }

  /**
   * @dev Get Rule
   */
  function getRule(uint256 ruleId) public view returns (Rule memory rule) {
    return _rules[ruleId];
  }

  /**
   * @dev Get Penalty
   */
  function getPenalty(address token, uint256 tokenId) public view returns (uint256 penalty) {
    return _penalties[token][tokenId];
  }

  /**
   * @dev Get Deposit balance
   */
  function getDepositBalance(address token) public view returns (uint256) {
    (, uint256 balance) = _depositBalancesMap.tryGet(token);
    return balance;
  }

  // WITHDRAW

  /**
   * @dev Withdraw the penalty balance for given token address and tokenId
   * @param item asset to withdraw.
   */
  function withdrawBalance(Asset memory item) public nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
    // Retrieve balance from storage.
    item.amount = _penalties[item.token][item.tokenId];
    if (item.amount == 0) {
      revert ZeroBalance();
    }

    // Emit an event indicating that penalty balance has withdrawn.
    emit BalanceWithdraw(_msgSender(), item);
    // clean penalty balance in _penalties mapping storage
    _penalties[item.token][item.tokenId] = 0;

    ExchangeUtils.spend(ExchangeUtils._toArray(item), _msgSender(), _allowedTypes);
  }

  /**
   * @dev Set the penalty for given asset
   * @param stakeId id,
   * @param item penalty.
   */
  function setPenalty(uint256 stakeId, Asset memory item) internal {
    // Emit an event indicating that penalty set.
    emit DepositPenalty(stakeId, item);
    // append penalty
    _penalties[item.token][item.tokenId] += item.amount;
  }

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
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, AllTypesHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Referral calculations.
   * @param referrer The Referrer address.
   * @param price The deposited Asset[].
   */
  function _afterPurchase(address referrer, Asset[] memory price) internal override(Referral) {
    return super._afterPurchase(referrer, price);
  }
}
