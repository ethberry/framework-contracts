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
error NoPrice();
error NoItems(); // RENT
error NoContent(); // MYSTERY/LOOT/WRAPPER/VESTING/WAIT LIST

// WAIT LIST
error AddressAlreadyExists(address account);
error RewardAlreadyClaimed();
error RootAlreadySet();
error MissingRoot();
error NoReward();

// DISPENSER
error WrongArrayLength(); // is used when two arrays has to be of the length size but they are not

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

// PREDICTION
error TreasuryFeeTooHigh(uint256 treasuryFee);
error PredictionAlreadyExists();
error PredictionNotFound();
error PredictionNotStarted();
error PredictionEnded();
error BetAmountTooLow();
error BetAmountNotMultipleOfStakeUnit();
error BetAlreadyPlaced();
error ResolutionNotAvailable();
error PredictionNotResolved();
error NotEligibleForClaim();
error CannotResolveAfterExpirationDate();
error PredictionAlreadyResolved();
error ExpiryTimeNotPassed();
error MustBeGreaterThanZero();
error ZeroAddressNotAllowed();
error TransferAmountExceedsAllowance();
error CannotClaimBeforeResolution();
error BetNotFound();
error InvalidOutcome();
error NoTreasuryAssets();
