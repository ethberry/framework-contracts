// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import "hardhat/console.sol";
// import { errors } from "../../utils/errors.sol";
// must include all errors here

contract ErrorsIdCalculator {
  // DIAMOND
  error FunctionDoesNotExist();
  error DiamondAlreadyInitialised();
  error MustBeContractOwner();
  error IncorrectFacetCutAction();
  error NoSelectorsInFacet();
  error AddFacetCantBeAddressZero();
  error FunctionAlreadyExists();
  error ReplaceFacetCantBeAddressZero();
  error ReplaceFunctionWithSameFunction();
  error RemoveFacetAddressMustBeAddressZero();
  error CantRemoveFunctionThatDoesntExist();
  error CantRemoveImmutableFunction();
  error FacetHasNoCode();

  // HIERARCHY
  error MethodNotSupported();
  error TemplateZero();
  error ProtectedAttribute(bytes32 attribute);

  // CONTRACT MANAGER, EXCHANGE
  error SignerMissingRole();
  error ExpiredSignature();

  // CONTRACT MANAGER
  error WrongRole();

  // EXCHANGE
  error UnsupportedTokenType();
  error ETHInvalidReceiver(address receiver);
  error ETHInsufficientBalance(address sender, uint256 balance, uint256 needed);
  error NoPrice();
  error NoItems();
  error NoContent();

  // WAIT LIST
  error AddressAlreadyExists(address account);
  error RewardAlreadyClaimed();
  error RootAlreadySet();
  error MissingRoot();
  error NoReward();

  // DISPENSER
  error WrongArrayLength();

  // BREED
  error PregnancyCountLimitExceed();
  error PregnancyTimeLimitExceed();
  // error NotOwnerNorApproved(address account);

  // LOTTERY/RAFFLE
  error NotOwnerNorApproved(address account);
  error WrongRound();
  error PrizeNotEligible();
  error TicketLimitExceed();
  error TicketExpired();
  error RoundNotComplete();
  error RoundNotActive();
  error WrongToken();

  // STAKING/PONZI
  error NotAnOwner(address account);
  error RuleNotExist();
  error RuleNotActive();
  error StakeLimitExceed();
  error BalanceExceed();
  error StakeNotExist();
  error StakeAlreadyWithdrawn();
  error ZeroBalance();
  error DepositNotComplete();
  error WrongTemplate();

  // MERGE
  error MergeDifferentContracts();
  error MergeDifferentTemplate();
}
