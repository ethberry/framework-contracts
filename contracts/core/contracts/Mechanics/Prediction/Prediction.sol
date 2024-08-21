// SPDX-License-Identifier: MIT

// Author: 7flash
// Website: https://gemunion.io/

pragma solidity ^0.8.0;
pragma abicoder v2;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ERC1363Receiver } from "@gemunion/contracts-erc1363/contracts/extensions/ERC1363Receiver.sol";

import {
  ContractNotAllowed,
  TreasuryFeeTooHigh,
  PredictionAlreadyExists,
  PredictionDoesNotExist,
  PredictionNotStarted,
  PredictionEnded,
  BetAmountTooLow,
  BetAmountNotMultipleOfStakeUnit,
  BetAlreadyPlaced,
  ResolutionNotAvailable,
  PredictionNotResolved,
  NotEligibleForClaim,
  CannotResolveBeforeResolution,
  PredictionAlreadyResolved,
  ExpiryTimeNotPassed,
  MustBeGreaterThanZero,
  ZeroAddressNotAllowed,
  TransferAmountExceedsAllowance,
  RoundNotBettable,
  WrongToken
} from "../../utils/errors.sol";

import {Asset, TokenType, AllowedTokenTypes} from "../../Exchange/lib/interfaces/IAsset.sol";
import {ExchangeUtils} from "../../Exchange/lib/ExchangeUtils.sol";

/**
 * @dev Contract module that allows users to participate in prediction markets.
 * Users can place bets on the outcome of events, and the contract handles the
 * resolution and reward distribution.
 */
contract Prediction is AccessControl, Pausable, ReentrancyGuard, ERC1363Receiver {
    using SafeERC20 for IERC20;

    address public treasuryAddress;

    uint256 public treasuryFee;
    uint256 public minBetUnits;
    Asset[] public treasuryFees;

    uint256 public constant MAX_TREASURY_FEE = 2000; // 20%

    PredictionMatch[] public predictions;
    mapping(bytes32 => uint256) private externalIdToIndex;
    mapping(bytes32 => mapping(address => BetInfo)) public ledger;
    mapping(address => bytes32[]) public userPredictions;
    mapping(address => Asset[]) public treasuryAssets;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    enum Position {
        LEFT,
        RIGHT
    }

    enum Outcome {
        LEFT,
        RIGHT,
        DRAW,
        ERROR
    }

    struct PredictionMatch {
        string externalId;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 resolutionTimestamp;
        uint256 expiryTimestamp;
        Asset betOnLeft;
        Asset betOnRight;
        Asset betUnit;
        Asset rewardUnit;
        Outcome outcome;
        bool resolved;
    }

    struct BetInfo {
        Position position;
        uint256 units;
        bool claimed;
    }

    event BetPlaced(address indexed sender, string externalId, Asset asset, Position position);
    event RewardsCalculated(string externalId, Asset rewardBase, uint256 rewardAmount, uint256 treasuryAmount);
    event Claim(address indexed sender, string externalId, uint256 amount);
    event PredictionEnd(string externalId, Outcome outcome);
    event NewTreasuryAddress(address treasury);
    event NewMinBetUnits(uint256 minBetUnits);
    event NewTreasuryFee(uint256 treasuryFee);
    event StartPrediction(string externalId);
    event TokenRecovery(address indexed token, uint256 amount);
    event TreasuryClaim();

    modifier validateBet(string memory externalId, uint256 units) {
        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        uint256 index = externalIdToIndex[externalIdHash];
        if (index == 0) {
            revert PredictionDoesNotExist();
        }
        if (block.timestamp < predictions[index].startTimestamp) {
            revert PredictionNotStarted();
        }
        if (block.timestamp > predictions[index].endTimestamp) {
            revert PredictionEnded();
        }
        if (units < minBetUnits) {
            revert BetAmountTooLow();
        }
        if (ledger[externalIdHash][msg.sender].units != 0) {
            revert BetAlreadyPlaced();
        }
        _;
    }

    /**
     * @dev Initializes the contract with the given parameters.
     *
     * Requirements:
     *
     * - `_treasuryFee` must be less than or equal to `MAX_TREASURY_FEE`.
     */
    constructor(
        address _operatorAddress,
        uint256 _treasuryFee
    ) {
        if (_treasuryFee > MAX_TREASURY_FEE) revert TreasuryFeeTooHigh();

        treasuryFee = _treasuryFee;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, _operatorAddress);

        treasuryFees = new Asset[](0);
    }

    /**
     * @dev Starts a new prediction round with the given parameters.
     *
     * Requirements:
     *
     * - The caller must have the `OPERATOR_ROLE`.
     * - `startTimestamp` must be less than `endTimestamp`.
     * - `endTimestamp` must be less than `resolutionTimestamp`.
     * - `resolutionTimestamp` must be less than `expiryTimestamp`.
     */
    function startPrediction(
        string memory externalId,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 resolutionTimestamp,
        uint256 expiryTimestamp,
        Asset memory betUnit
    ) external onlyRole(OPERATOR_ROLE) {
        if (startTimestamp >= endTimestamp) {
            revert PredictionNotStarted();
        }
        if (endTimestamp >= resolutionTimestamp) {
            revert PredictionEnded();
        }
        if (resolutionTimestamp >= expiryTimestamp) {
            revert CannotResolveBeforeResolution();
        }
        if (betUnit.tokenType != TokenType.ERC20 && betUnit.tokenType != TokenType.NATIVE) {
            revert WrongToken();
        }

        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        if (externalIdToIndex[externalIdHash] != 0) {
            revert PredictionAlreadyExists();
        }

        predictions.push(PredictionMatch({
            externalId: externalId,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            resolutionTimestamp: resolutionTimestamp,
            expiryTimestamp: expiryTimestamp,
            betOnLeft: Asset(betUnit.tokenType, betUnit.token, betUnit.tokenId, 0),
            betOnRight: Asset(betUnit.tokenType, betUnit.token, betUnit.tokenId, 0),
            betUnit: betUnit,
            rewardUnit: betUnit,
            outcome: Outcome.ERROR,
            resolved: false
        }));

        externalIdToIndex[externalIdHash] = predictions.length - 1;

        emit StartPrediction(externalId);
    }

    /**
     * @dev Places a bet on the left or right side of the prediction using ERC20 or native tokens.
     *
     * Requirements:
     *
     * - The prediction must exist.
     * - The current timestamp must be within the betting period.
     * - The bet amount must be greater than or equal to `minBetUnits`.
     * - The user must not have already placed a bet on this prediction.
     */
    function placeBet(
        string memory externalId,
        uint256 units,
        Position position
    ) external payable whenNotPaused nonReentrant validateBet(externalId, units) {
        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        uint256 index = externalIdToIndex[externalIdHash];
        PredictionMatch storage prediction = predictions[index];
        Asset memory betUnit = prediction.betUnit;

        Asset[] memory price = new Asset[](1);
        price[0] = betUnit;
        price[0].amount = units * betUnit.amount;

        if (betUnit.tokenType == TokenType.ERC20) {
            if (msg.value != 0) {
                revert WrongToken();
            }
            ExchangeUtils.spendFrom(price, msg.sender, address(this), AllowedTokenTypes(false, true, false, false, false));
        } else if (betUnit.tokenType == TokenType.NATIVE) {
            if (msg.value < units * betUnit.amount) {
                revert BetAmountTooLow();
            }
            ExchangeUtils.spend(price, address(this), AllowedTokenTypes(true, false, false, false, false));
        } else {
            revert WrongToken();
        }

        if (position == Position.LEFT) {
            prediction.betOnLeft.amount += price[0].amount;
        } else {
            prediction.betOnRight.amount += price[0].amount;
        }

        BetInfo storage betInfo = ledger[externalIdHash][msg.sender];
        betInfo.position = position;
        betInfo.units = units;
        userPredictions[msg.sender].push(externalIdHash);

        emit BetPlaced(msg.sender, externalId, price[0], position);
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
    function claim(string memory externalId) external nonReentrant {
        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        if (externalIdToIndex[externalIdHash] == 0) {
            revert PredictionDoesNotExist();
        }

        PredictionMatch storage prediction = predictions[externalIdToIndex[externalIdHash]];

        if (block.timestamp <= prediction.resolutionTimestamp) {
            revert ResolutionNotAvailable();
        }

        uint256 reward = 0;
        if (!prediction.resolved) {
            revert PredictionNotResolved();
        }
        if (!claimable(externalIdHash, msg.sender)) {
            revert NotEligibleForClaim();
        }

        BetInfo memory betInfo = ledger[externalIdHash][msg.sender];
        Asset memory betUnit = prediction.betUnit;

        uint256 baseStake = betInfo.units * betUnit.amount;

        if (prediction.outcome == Outcome.DRAW || prediction.outcome == Outcome.ERROR) {
            reward = baseStake;
        } else {
            uint256 userReward = betInfo.units * prediction.rewardUnit.amount;
            reward = baseStake + userReward;
        }

        ledger[externalIdHash][msg.sender].claimed = true;

        if (reward > 0) {
            Asset[] memory rewardAsset = ExchangeUtils._toArray(Asset({
                tokenType: betUnit.tokenType,
                token: betUnit.token,
                tokenId: 0,
                amount: reward
            }));

            ExchangeUtils.spend(rewardAsset, msg.sender, AllowedTokenTypes(true, true, true, true, true));
        }

        emit Claim(msg.sender, externalId, reward);
    }

    /**
     * @dev Resolves a prediction with the given outcome.
     *
     * Requirements:
     *
     * - The caller must have the `OPERATOR_ROLE`.
     * - The prediction must exist.
     * - The current timestamp must be after the resolution timestamp.
     * - The prediction must not be already resolved.
     */
    function resolvePrediction(string memory externalId, Outcome outcome) external whenNotPaused onlyRole(OPERATOR_ROLE) {
        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        uint256 index = externalIdToIndex[externalIdHash];
        if (index == 0) {
            revert PredictionDoesNotExist();
        }
        if (block.timestamp < predictions[index].resolutionTimestamp) {
            revert CannotResolveBeforeResolution();
        }
        if (predictions[index].resolved) {
            revert PredictionAlreadyResolved();
        }

        PredictionMatch storage prediction = predictions[index];
        if (prediction.betOnLeft.amount == 0 || prediction.betOnRight.amount == 0) {
            _safePredictionEnd(index, Outcome.ERROR);
        } else {
            _safePredictionEnd(index, outcome);
            _calculateRewards(index);
        }
    }

    /**
     * @dev Resolves a prediction as an error if the expiry time has passed.
     *
     * Requirements:
     *
     * - The prediction must exist.
     * - The current timestamp must be after the expiry timestamp.
     * - The prediction must not be already resolved.
     */
    function resolvePredictionError(string memory externalId) external {
        bytes32 externalIdHash = keccak256(abi.encodePacked(externalId));
        uint256 index = externalIdToIndex[externalIdHash];
        if (index == 0) {
            revert PredictionDoesNotExist();
        }
        if (block.timestamp <= predictions[index].expiryTimestamp) {
            revert ExpiryTimeNotPassed();
        }
        if (predictions[index].resolved) {
            revert PredictionAlreadyResolved();
        }

        PredictionMatch storage prediction = predictions[index];
        prediction.outcome = Outcome.ERROR;
        prediction.resolved = true;

        emit PredictionEnd(externalId, Outcome.ERROR);
    }

    /**
     * @dev Claims the treasury amount.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function claimTreasury() external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = treasuryFees.length;
        for (uint256 i = 0; i < length; i++) {
            Asset memory fee = treasuryFees[i];
            Asset[] memory treasuryAsset = ExchangeUtils._toArray(fee);
            ExchangeUtils.spend(treasuryAsset, treasuryAddress, AllowedTokenTypes(true, true, true, true, true));
        }
        delete treasuryFees;

        emit TreasuryClaim();
    }

    function getTreasuryFees() external view returns (Asset[] memory) {
        return treasuryFees;
    }

    /**
     * @dev Pauses the contract.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function pause() external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     */
    function unpause() external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
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
    function setTreasuryFee(uint256 _treasuryFee) external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasuryFee > MAX_TREASURY_FEE) {
            revert TreasuryFeeTooHigh();
        }
        treasuryFee = _treasuryFee;
        emit NewTreasuryFee(treasuryFee);
    }

    /**
     * @dev Returns the predictions and bet information for a user.
     */
    function getUserPredictions(address user, uint256 cursor, uint256 size) external view returns (bytes32[] memory, BetInfo[] memory, uint256) {
        uint256 length = size;
        if (length > userPredictions[user].length - cursor) {
            length = userPredictions[user].length - cursor;
        }

        bytes32[] memory values = new bytes32[](length);
        BetInfo[] memory betInfo = new BetInfo[](length);

        for (uint256 i = 0; i < length; i++) {
            values[i] = userPredictions[user][cursor + i];
            betInfo[i] = ledger[values[i]][user];
        }

        return (values, betInfo, cursor + length);
    }

    /**
     * @dev Returns the number of predictions for a user.
     */
    function getUserPredictionsLength(address user) external view returns (uint256) {
        return userPredictions[user].length;
    }

    /**
     * @dev Checks if a user is eligible to claim rewards for a prediction.
     */
    function claimable(bytes32 externalIdHash, address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[externalIdHash][user];
        PredictionMatch memory prediction = predictions[externalIdToIndex[externalIdHash]];

        if (prediction.outcome == Outcome.DRAW) {
            return true;
        }

        return
            prediction.resolved &&
            betInfo.units != 0 &&
            !betInfo.claimed &&
            ((prediction.outcome == Outcome.LEFT && betInfo.position == Position.LEFT) ||
                (prediction.outcome == Outcome.RIGHT && betInfo.position == Position.RIGHT));
    }

    /**
     * @dev Calculates the rewards for a resolved prediction.
     */
    function _calculateRewards(uint256 predictionId) internal {
        PredictionMatch storage prediction = predictions[predictionId];
        Asset memory betUnit = prediction.betUnit;
        uint256 rewardBaseUnits;
        uint256 treasuryAmt;
        uint256 rewardAmount;

        if (prediction.outcome == Outcome.LEFT) {
            rewardBaseUnits = prediction.betOnLeft.amount / betUnit.amount;
            treasuryAmt = (prediction.betOnRight.amount * treasuryFee) / 10000;
            rewardAmount = prediction.betOnRight.amount - treasuryAmt;
        } else if (prediction.outcome == Outcome.RIGHT) {
            rewardBaseUnits = prediction.betOnRight.amount / betUnit.amount;
            treasuryAmt = (prediction.betOnLeft.amount * treasuryFee) / 10000;
            rewardAmount = prediction.betOnLeft.amount - treasuryAmt;
        } else {
            rewardBaseUnits = 0;
            rewardAmount = 0;
            treasuryAmt = 0;
        }

        prediction.rewardUnit = Asset({
            tokenType: TokenType.ERC20,
            token: betUnit.token,
            tokenId: 0,
            amount: rewardAmount / rewardBaseUnits
        });

        treasuryFees.push(Asset({
            tokenType: betUnit.tokenType,
            token: betUnit.token,
            tokenId: 0,
            amount: treasuryAmt
        }));

        emit RewardsCalculated(prediction.externalId, prediction.rewardUnit, rewardAmount, treasuryAmt);
    }

    /**
     * @dev Safely ends a prediction with the given outcome.
     */
    function _safePredictionEnd(uint256 predictionId, Outcome outcome) internal {
        if (predictions[predictionId].endTimestamp == 0) {
            revert RoundNotBettable();
        }
        if (block.timestamp < predictions[predictionId].resolutionTimestamp) {
            revert CannotResolveBeforeResolution();
        }

        PredictionMatch storage prediction = predictions[predictionId];
        prediction.outcome = outcome;
        prediction.resolved = true;

        emit PredictionEnd(prediction.externalId, outcome);
    }

    /**
     * @dev Checks if an address is a contract.
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
      bytes4 interfaceId
    ) public view virtual override(AccessControl) returns (bool) {
      return super.supportsInterface(interfaceId);
    }
}
