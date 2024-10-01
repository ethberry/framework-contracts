// SPDX-License-Identifier: MIT

// Author: 7flash
// Website: https://ethberry.io/

pragma solidity ^0.8.0;
pragma abicoder v2;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { CoinHolder, NativeReceiver } from "@ethberry/contracts-finance/contracts/Holder.sol";
import { PAUSER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { Asset, TokenType, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IPrediction } from "./interfaces/IPrediction.sol";

/**
 * @dev Contract module that allows users to participate in prediction markets.
 * Users can place bets on the outcome of events, and the contract handles the
 * resolution and reward distribution.
 */
contract Prediction is IPrediction, AccessControl, Pausable, CoinHolder, NativeReceiver {
  using SafeERC20 for IERC20;

  uint256 public constant MAX_TREASURY_FEE = 1000; // 10%

  uint256 private _treasuryFee;
  uint256 private _predictionIdCounter;

  Asset[] private _treasuryAssets;
  mapping(uint256 => PredictionMatch) private _predictions; // predictionId => PredictionMatch
  mapping(uint256 => mapping(address => BetInfo)) private _ledger; // predictionId => account => BetInfo

  event BetPlaced(uint256 predictionId, address indexed sender, Asset asset, Position position);
  event RewardsCalculated(uint256 predictionId, Asset rewardBase);
  event Claim(uint256 predictionId, address indexed sender, Asset asset);
  event PredictionStart(uint256 predictionId);
  event PredictionEnd(uint256 predictionId, Outcome outcome);
  event NewTreasuryFee(uint256 treasuryFee);
  event TreasuryClaim();

  /**
   * @dev Initializes the contract with the given parameters.
   *
   * Requirements:
   *
   * - `_treasuryFee` must be less than or equal to `MAX_TREASURY_FEE`.
   */
  constructor(PredictionConfig memory config) {
    _setTreasuryFee(config.treasuryFee);
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @dev Starts a new prediction round with the given parameters.
   *
   * Requirements:
   *
   * - The caller must have the `DEFAULT_ADMIN_ROLE`.
   * - `startTimestamp` must be less than `endTimestamp`.
   * - `endTimestamp` must be less than `expiryTimestamp`.
   * - `expiryTimestamp` terminates prediction no matter what.
   */
  function startPrediction(
    uint256 startTimestamp,
    uint256 endTimestamp,
    uint256 expiryTimestamp,
    Asset memory betAsset
  ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    if (startTimestamp >= endTimestamp) {
      revert PredictionNotStarted();
    }
    if (endTimestamp >= expiryTimestamp) {
      revert PredictionEnded();
    }

    if (betAsset.tokenType != TokenType.ERC20 && betAsset.tokenType != TokenType.NATIVE) {
      revert PredictionWrongToken();
    }

    uint256 predictionId = ++_predictionIdCounter;

    _predictions[predictionId] = PredictionMatch({
      startTimestamp: startTimestamp,
      endTimestamp: endTimestamp,
      expiryTimestamp: expiryTimestamp,
      betOnLeft: Asset(betAsset.tokenType, betAsset.token, betAsset.tokenId, 0),
      betOnRight: Asset(betAsset.tokenType, betAsset.token, betAsset.tokenId, 0),
      betAsset: betAsset,
      rewardAsset: Asset(betAsset.tokenType, betAsset.token, betAsset.tokenId, 0),
      outcome: Outcome.ERROR,
      resolved: false
    });

    emit PredictionStart(predictionId);
  }

  /**
   * @dev Places a bet on the left or right side of the prediction using ERC20 or native tokens.
   *
   * Requirements:
   *
   * - The prediction must exist.
   * - The current timestamp must be within the betting period.
   * - The user must not have already placed a bet on this prediction.
   */
  function placeBet(uint256 predictionId, uint256 multiplier, Position position) external payable whenNotPaused {
    PredictionMatch storage prediction = _predictions[predictionId];
    Asset memory betAsset = prediction.betAsset;

    if (_predictionIdCounter < predictionId) {
      revert PredictionNotFound();
    }
    if (block.timestamp < prediction.startTimestamp) {
      revert PredictionNotStarted();
    }
    if (block.timestamp > prediction.endTimestamp) {
      revert PredictionEnded();
    }
    if (multiplier == 0) {
      revert PredictionBetAmountTooLow();
    }
    if (prediction.resolved == true) {
      revert PredictionAlreadyResolved();
    }

    BetInfo storage betInfo = _ledger[predictionId][_msgSender()];

    if (betInfo.multiplier != 0 && betInfo.position != position) {
      revert PredictionBetAlreadyPlaced();
    }

    betInfo.multiplier += multiplier;
    betInfo.position = position;

    Asset[] memory price = new Asset[](1);
    price[0] = betAsset;
    price[0].amount = multiplier * betAsset.amount;

    ExchangeUtils.spendFrom(price, _msgSender(), address(this), AllowedTokenTypes(true, true, false, false, false));

    if (position == Position.LEFT) {
      prediction.betOnLeft.amount += price[0].amount;
    } else {
      prediction.betOnRight.amount += price[0].amount;
    }

    emit BetPlaced(predictionId, _msgSender(), price[0], position);
  }

  /**
   * @dev Claims the reward for a resolved prediction.
   *
   * Requirements:
   *
   * - The prediction must exist.
   * - The current timestamp must be after the resolution timestamp.
   * - The prediction must be resolved.
   * - The user must be eligible for the claim.
   */
  function claim(uint256 predictionId) external {
    PredictionMatch storage prediction = _predictions[predictionId];
    BetInfo memory betInfo = _ledger[predictionId][_msgSender()];

    if (predictionId == 0 || prediction.startTimestamp == 0) {
      revert PredictionNotFound();
    }

    // first claim after expiration date resolves prediction
    if (!prediction.resolved && prediction.expiryTimestamp < block.timestamp) {
      _safePredictionEnd(predictionId, Outcome.EXPIRED);
    }

    if (!prediction.resolved) {
      revert PredictionCannotClaimBeforeResolution();
    }

    if (betInfo.multiplier == 0) {
      revert PredictionBetNotFound();
    }

    if (
      !(prediction.outcome == Outcome.EXPIRED) &&
      !(prediction.outcome == Outcome.DRAW) &&
      !(prediction.outcome == Outcome.LEFT && betInfo.position == Position.LEFT) &&
      !(prediction.outcome == Outcome.RIGHT && betInfo.position == Position.RIGHT)
    ) {
      revert PredictionNotEligibleForClaim();
    }

    if (betInfo.claimed) {
      revert PredictionRewardAlreadyClaimed();
    }

    _ledger[predictionId][_msgSender()].claimed = true;

    Asset memory rewardAsset = Asset({
      tokenType: prediction.betAsset.tokenType,
      token: prediction.betAsset.token,
      tokenId: 0,
      amount: betInfo.multiplier * prediction.betAsset.amount + betInfo.multiplier * prediction.rewardAsset.amount
    });

    ExchangeUtils.spend(
      ExchangeUtils._toArray(rewardAsset),
      _msgSender(),
      AllowedTokenTypes(true, true, false, false, false)
    );

    emit Claim(predictionId, _msgSender(), rewardAsset);
  }

  /**
   * @dev Resolves a prediction with the given outcome.
   *
   * Requirements:
   *
   * - The caller must have the `DEFAULT_ADMIN_ROLE`.
   * - The prediction must exist.
   * - The current timestamp must be after the resolution timestamp.
   * - The prediction must not be already resolved.
   */
  function resolvePrediction(
    uint256 predictionId,
    Outcome outcome
  ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    PredictionMatch storage prediction = _predictions[predictionId];

    if (predictionId == 0 || prediction.startTimestamp == 0) {
      revert PredictionNotFound();
    }
    if (prediction.resolved) {
      revert PredictionAlreadyResolved();
    }

    if (prediction.expiryTimestamp < block.timestamp) {
      _safePredictionEnd(predictionId, Outcome.EXPIRED);
    } else if (prediction.betOnLeft.amount == 0 || prediction.betOnRight.amount == 0) {
      _safePredictionEnd(predictionId, Outcome.ERROR);
    } else if (outcome == Outcome.LEFT || outcome == Outcome.RIGHT) {
      _safePredictionEnd(predictionId, outcome);
      _calculateRewards(predictionId);
    } else if (outcome == Outcome.DRAW) {
      _safePredictionEnd(predictionId, outcome);
    } else {
      revert PredictionInvalidOutcome();
    }
  }

  /**
   * @dev Claims the treasury amount.
   *
   * Requirements:
   *
   * - The caller must have the `DEFAULT_ADMIN_ROLE`.
   */
  function claimTreasury() external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (_treasuryAssets.length == 0) {
      revert PredictionNoTreasuryAssets();
    }

    Asset[] memory treasuryAssets = _treasuryAssets;
    delete _treasuryAssets;

    ExchangeUtils.spend(treasuryAssets, _msgSender(), AllowedTokenTypes(true, true, false, false, false));

    emit TreasuryClaim();
  }

  function getTreasuryFees() external view returns (Asset[] memory) {
    return _treasuryAssets;
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
   * @dev Sets the treasury fee.
   *
   * Requirements:
   *
   * - The caller must have the `DEFAULT_ADMIN_ROLE`.
   * - `_treasuryFee` must be less than or equal to `MAX_TREASURY_FEE`.
   */
  function setTreasuryFee(uint256 treasuryFee) external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
    _setTreasuryFee(treasuryFee);
  }

  function _setTreasuryFee(uint256 treasuryFee) internal {
    if (treasuryFee > MAX_TREASURY_FEE) {
      revert PredictionTreasuryFeeTooHigh(treasuryFee);
    }
    _treasuryFee = treasuryFee;
    emit NewTreasuryFee(treasuryFee);
  }

  /**
   * @dev Calculates the rewards for a resolved prediction.
   */
  function _calculateRewards(uint256 predictionId) internal {
    PredictionMatch storage prediction = _predictions[predictionId];
    Asset memory betAsset = prediction.betAsset;
    uint256 rewardBaseUnits = 0;
    uint256 treasuryAmt = 0;
    uint256 rewardAmount = 0;

    if (prediction.outcome == Outcome.LEFT) {
      rewardBaseUnits = prediction.betOnLeft.amount / betAsset.amount;
      treasuryAmt = (prediction.betOnRight.amount * _treasuryFee) / 10000;
      rewardAmount = prediction.betOnRight.amount - treasuryAmt;
    } else if (prediction.outcome == Outcome.RIGHT) {
      rewardBaseUnits = prediction.betOnRight.amount / betAsset.amount;
      treasuryAmt = (prediction.betOnLeft.amount * _treasuryFee) / 10000;
      rewardAmount = prediction.betOnLeft.amount - treasuryAmt;
    }

    prediction.rewardAsset = Asset({
      tokenType: TokenType.ERC20,
      token: betAsset.token,
      tokenId: 0,
      amount: rewardAmount / rewardBaseUnits
    });

    _treasuryAssets.push(
      Asset({ tokenType: betAsset.tokenType, token: betAsset.token, tokenId: 0, amount: treasuryAmt })
    );

    emit RewardsCalculated(predictionId, prediction.rewardAsset);
  }

  /**
   * @dev Safely ends a prediction with the given outcome.
   */
  function _safePredictionEnd(uint256 predictionId, Outcome outcome) internal {
    PredictionMatch storage prediction = _predictions[predictionId];

    if (prediction.endTimestamp == 0) {
      revert PredictionNotFound();
    }

    prediction.outcome = outcome;
    prediction.resolved = true;

    emit PredictionEnd(predictionId, outcome);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, CoinHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Getter function to retrieve the details of a specific prediction.
   */
  function getPrediction(uint256 predictionId) external view returns (PredictionMatch memory) {
    return _predictions[predictionId];
  }

  function getBetInfo(uint256 predictionId, address account) external view returns (BetInfo memory) {
    return _ledger[predictionId][account];
  }
}
