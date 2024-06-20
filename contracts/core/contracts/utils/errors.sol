// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

// general
error MethodNotSupported();
error TemplateZero();
error UnsupportedTokenType();

// Contract Manager, Exchange
error SignerMissingRole();
error ExpiredSignature();
error WrongRole();

// Lottery, Ponzi, Staking
error NotExist();
error NotAnOwner();

error AlreadyExist();

// Breed
error CountExceed();
error LimitExceed();

error BalanceExceed();
error WrongAmount();
error RefProgramSet();
error WrongArrayLength();

// Mystery/Wrapper
error NoContent();

// Blacklist, Discrete, Genes
error ProtectedAttribute(bytes32 attribute);

// staking
error WrongToken();
error WrongStake();
error WrongRule();
error Expired();
error ZeroBalance();
error NotComplete();
error NotActive();

// lottery, raffle
error WrongRound();
error WrongPrice();

// WaitList
error NotInList();

// Diamond
error FunctionDoesNotExist();

// DiamonInit
error DiamondAlreadyInitialised();

// DiamondLib
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
