// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

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
error MethodNotSupported(); // used to disable mint, safeMint, mintCommon functions
error TemplateZero(); // used to validate templateId in mint* functions
error ProtectedAttribute(bytes32 attribute); // protects system attributes TEMPLATE_ID, RARITY

// CONTRACT MANAGER, EXCHANGE
error SignerMissingRole(); // used to indicate that server signature does match but signer is not authorised
error ExpiredSignature(); // used to indicate that server signature has expired

// CONTRACT MANAGER
error WrongRole(); // not supported role

// EXCHANGE
error UnsupportedTokenType(); // used to indicate that certain token types are not allowed for mechanics
error ETHInvalidReceiver(address receiver); // contract does not implement `receive` method
error ETHInsufficientBalance(address sender, uint256 balance, uint256 needed); // transaction has not enough ETH

// WAIT LIST
error AddressIsNotInTheList(address account);
error RewardAlreadyClaimed();
error RewardIsEmpty();
error RootAlreadySet();
error RootDoesNotExist();

// MYSTERY/LOOT/WRAPPER/VESTING/WAIT LIST
error NoContent(); // content has to be set

// DISPENSER
error WrongArrayLength(); // is used when two arrays has to be of the length size but they are not

// BREED/RAFFLE/LOTTERY
error NotOwnerNorApproved(address account);

// BREED
error PregnancyCountLimitExceed();
error PregnancyTimeLimitExceed();

// LOTTERY/RAFFLE
error WrongRound();
error NotAWinner();

// STAKING/PONZI
error NotAnOwner(address account);





// Lottery, Ponzi, Staking
error NotExist();
error LimitExceed();
error BalanceExceed();
error WrongAmount();
error WrongPrice();

// staking
error WrongToken();
error WrongStake();
error WrongRule();
error Expired();
error ZeroBalance();
error NotComplete();
error NotActive();





