// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset, TokenType, AllowedTokenTypes } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IPredictionErrors } from "./IPredictionErrors.sol";

interface IPrediction is IPredictionErrors {
	enum Position {
		LEFT,
		RIGHT
	}

	enum Outcome {
		LEFT,
		RIGHT,
		DRAW,
		ERROR,
		EXPIRED
	}

	struct PredictionConfig {
		uint256 treasuryFee;
	}

	struct PredictionMatch {
		uint256 startTimestamp;
		uint256 endTimestamp;
		uint256 expiryTimestamp;
		Asset betOnLeft;
		Asset betOnRight;
		Asset betAsset;
		Asset rewardAsset;
		Outcome outcome;
		bool resolved;
	}

	struct BetInfo {
		Position position;
		uint256 multiplier;
		bool claimed;
	}
}
