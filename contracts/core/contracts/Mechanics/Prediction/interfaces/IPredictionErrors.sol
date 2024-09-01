// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IPredictionErrors {
	error PredictionTreasuryFeeTooHigh(uint256 treasuryFee);
	error PredictionNotFound();
	error PredictionNotStarted();
	error PredictionEnded();
	error PredictionBetAmountTooLow();
	error PredictionBetAlreadyPlaced();
	error PredictionNotEligibleForClaim();
	error PredictionAlreadyResolved();
	error PredictionCannotClaimBeforeResolution();
	error PredictionBetNotFound();
	error PredictionInvalidOutcome();
	error PredictionNoTreasuryAssets();
	error PredictionRewardAlreadyClaimed();
	error PredictionWrongToken();
}
