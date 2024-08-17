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

import {
  ContractNotAllowed,
  TreasuryFeeTooHigh,
  PredictionAlreadyExists,
  PredictionDoesNotExist,
  BettingNotStarted,
  BettingEnded,
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
  RoundNotBettable
} from "../../utils/errors.sol";

/**
 * @dev Contract module that allows users to participate in prediction markets.
 * Users can place bets on the outcome of events, and the contract handles the
 * resolution and reward distribution.
 */
contract Prediction is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public token;
    address public treasuryAddress;

    uint256 public minBetUnits;
    uint256 public treasuryFee;
    uint256 public stakeUnit;
    uint256 public treasuryAmount;

    uint256 public constant MAX_TREASURY_FEE = 2000; // 20%

    mapping(bytes32 => mapping(address => BetInfo)) public ledger;
    mapping(bytes32 => PredictionRound) public predictions;
    mapping(address => bytes32[]) public userPredictions;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    enum Position {
        Left,
        Right
    }

    enum Outcome {
        Left,
        Right,
        DRAW,
        ERROR
    }

    struct PredictionRound {
        bytes32 id;
        string title;
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 resolutionTimestamp;
        uint256 expiryTimestamp;
        uint256 leftUnits;
        uint256 rightUnits;
        uint256 rewardBaseUnits;
        uint256 rewardAmount;
        Outcome outcome;
        bool resolved;
    }

    struct BetInfo {
        Position position;
        uint256 units;
        bool claimed;
    }

    event BetLeft(address indexed sender, bytes32 indexed predictionId, uint256 units);
    event BetRight(address indexed sender, bytes32 indexed predictionId, uint256 units);
    event Claim(address indexed sender, bytes32 indexed predictionId, uint256 amount);
    event EndPrediction(bytes32 indexed predictionId, Outcome outcome);
    event NewTreasuryAddress(address treasury);
    event NewMinBetUnits(uint256 minBetUnits);
    event NewTreasuryFee(uint256 treasuryFee);
    event NewStakeUnit(uint256 stakeUnit);
    event NewOperatorAddress(address operator);
    event RewardsCalculated(bytes32 indexed predictionId, uint256 rewardBaseUnits, uint256 rewardAmount, uint256 treasuryAmount);
    event StartPrediction(bytes32 indexed predictionId, string title);
    event TokenRecovery(address indexed token, uint256 amount);
    event TreasuryClaim(uint256 amount);

    modifier notContract() {
        if (_isContract(msg.sender)) revert ContractNotAllowed();
        if (msg.sender != tx.origin) revert ContractNotAllowed();
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
        IERC20 _token,
        address _treasuryAddress,
        address _operatorAddress,
        uint256 _minBetUnits,
        uint256 _stakeUnit,
        uint256 _treasuryFee
    ) {
        if (_treasuryFee > MAX_TREASURY_FEE) revert TreasuryFeeTooHigh();

        token = _token;
        treasuryAddress = _treasuryAddress;
        minBetUnits = _minBetUnits;
        stakeUnit = _stakeUnit;
        treasuryFee = _treasuryFee;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, _operatorAddress);
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
        string memory title,
        uint256 startTimestamp,
        uint256 endTimestamp,
        uint256 resolutionTimestamp,
        uint256 expiryTimestamp
    ) external onlyRole(OPERATOR_ROLE) {
        if (startTimestamp >= endTimestamp) revert BettingNotStarted();
        if (endTimestamp >= resolutionTimestamp) revert BettingEnded();
        if (resolutionTimestamp >= expiryTimestamp) revert CannotResolveBeforeResolution();

        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp != 0) revert PredictionAlreadyExists();

        predictions[predictionId] = PredictionRound({
            id: predictionId,
            title: title,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            resolutionTimestamp: resolutionTimestamp,
            expiryTimestamp: expiryTimestamp,
            leftUnits: 0,
            rightUnits: 0,
            rewardBaseUnits: 0,
            rewardAmount: 0,
            outcome: Outcome.ERROR,
            resolved: false
        });

        emit StartPrediction(predictionId, title);
    }

    /**
     * @dev Places a bet on the left side of the prediction.
     *
     * Requirements:
     *
     * - The prediction must exist.
     * - The current timestamp must be within the betting period.
     * - The bet amount must be greater than or equal to `minBetUnits`.
     * - The user must not have already placed a bet on this prediction.
     */
    function betLeft(string memory title, uint256 units) external whenNotPaused nonReentrant notContract {
        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp == 0) revert PredictionDoesNotExist();
        if (block.timestamp < predictions[predictionId].startTimestamp) revert BettingNotStarted();
        if (block.timestamp > predictions[predictionId].endTimestamp) revert BettingEnded();
        if (units < minBetUnits) revert BetAmountTooLow();
        if (ledger[predictionId][msg.sender].units != 0) revert BetAlreadyPlaced();

        uint256 amount = units * stakeUnit;
        token.safeTransferFrom(msg.sender, address(this), amount);
        PredictionRound storage prediction = predictions[predictionId];
        prediction.leftUnits += units;

        BetInfo storage betInfo = ledger[predictionId][msg.sender];
        betInfo.position = Position.Left;
        betInfo.units = units;
        userPredictions[msg.sender].push(predictionId);

        emit BetLeft(msg.sender, predictionId, units);
    }

    /**
     * @dev Places a bet on the right side of the prediction.
     *
     * Requirements:
     *
     * - The prediction must exist.
     * - The current timestamp must be within the betting period.
     * - The bet amount must be greater than or equal to `minBetUnits`.
     * - The user must not have already placed a bet on this prediction.
     */
    function betRight(string memory title, uint256 units) external whenNotPaused nonReentrant notContract {
        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp == 0) revert PredictionDoesNotExist();
        if (block.timestamp < predictions[predictionId].startTimestamp) revert BettingNotStarted();
        if (block.timestamp > predictions[predictionId].endTimestamp) revert BettingEnded();
        if (units < minBetUnits) revert BetAmountTooLow();
        if (ledger[predictionId][msg.sender].units != 0) revert BetAlreadyPlaced();

        uint256 amount = units * stakeUnit;
        token.safeTransferFrom(msg.sender, address(this), amount);
        PredictionRound storage prediction = predictions[predictionId];
        prediction.rightUnits += units;

        BetInfo storage betInfo = ledger[predictionId][msg.sender];
        betInfo.position = Position.Right;
        betInfo.units = units;
        userPredictions[msg.sender].push(predictionId);

        emit BetRight(msg.sender, predictionId, units);
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
    function claim(string memory title) external nonReentrant notContract {
        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp == 0) revert PredictionDoesNotExist();
        if (block.timestamp <= predictions[predictionId].resolutionTimestamp) revert ResolutionNotAvailable();

        uint256 reward = 0;
        if (!predictions[predictionId].resolved) revert PredictionNotResolved();
        if (!claimable(predictionId, msg.sender)) revert NotEligibleForClaim();

        PredictionRound memory prediction = predictions[predictionId];
        BetInfo memory betInfo = ledger[predictionId][msg.sender];

        uint256 baseStake = betInfo.units * stakeUnit;

        if (prediction.outcome == Outcome.DRAW) {
            reward = baseStake;
        } else {
            uint256 userReward = (betInfo.units * prediction.rewardAmount) / prediction.rewardBaseUnits;
            reward = baseStake + userReward;
        }
        
        ledger[predictionId][msg.sender].claimed = true;
        if (reward > 0) {
            token.safeTransfer(msg.sender, reward);
        }

        emit Claim(msg.sender, predictionId, reward);
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
    function resolvePrediction(string memory title, Outcome outcome) external whenNotPaused onlyRole(OPERATOR_ROLE) {
        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp == 0) revert PredictionDoesNotExist();
        if (block.timestamp < predictions[predictionId].resolutionTimestamp) revert CannotResolveBeforeResolution();
        if (predictions[predictionId].resolved) revert PredictionAlreadyResolved();

        _safeEndPrediction(predictionId, outcome);
        _calculateRewards(predictionId);
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
    function resolvePredictionError(string memory title) external {
        bytes32 predictionId = keccak256(abi.encodePacked(title, address(this)));
        if (predictions[predictionId].startTimestamp == 0) revert PredictionDoesNotExist();
        if (block.timestamp <= predictions[predictionId].expiryTimestamp) revert ExpiryTimeNotPassed();
        if (predictions[predictionId].resolved) revert PredictionAlreadyResolved();

        PredictionRound storage prediction = predictions[predictionId];
        prediction.outcome = Outcome.ERROR;
        prediction.resolved = true;

        emit EndPrediction(predictionId, Outcome.ERROR);
    }

    /**
     * @dev Claims the treasury amount.
     *
     * Requirements:
     *
     * - The caller must have the `OPERATOR_ROLE`.
     */
    function claimTreasury() external nonReentrant onlyRole(OPERATOR_ROLE) {
        uint256 currentTreasuryAmount = treasuryAmount;
        treasuryAmount = 0;
        token.safeTransfer(treasuryAddress, currentTreasuryAmount);
        emit TreasuryClaim(currentTreasuryAmount);
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
     * @dev Sets the minimum bet units.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     * - `_minBetUnits` must be greater than zero.
     */
    function setMinBetUnits(uint256 _minBetUnits) external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_minBetUnits == 0) revert MustBeGreaterThanZero();
        minBetUnits = _minBetUnits;
        emit NewMinBetUnits(minBetUnits);
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
        if (_treasuryFee > MAX_TREASURY_FEE) revert TreasuryFeeTooHigh();
        treasuryFee = _treasuryFee;
        emit NewTreasuryFee(treasuryFee);
    }

    /**
     * @dev Recovers tokens mistakenly sent to the contract.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     * - `_token` must not be the prediction token.
     */
    function recoverToken(address _token, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == address(token)) revert TransferAmountExceedsAllowance();
        IERC20(_token).safeTransfer(msg.sender, _amount);
        emit TokenRecovery(_token, _amount);
    }

    /**
     * @dev Sets the treasury address.
     *
     * Requirements:
     *
     * - The caller must have the `DEFAULT_ADMIN_ROLE`.
     * - `_treasuryAddress` must not be the zero address.
     */
    function setTreasury(address _treasuryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasuryAddress == address(0)) revert ZeroAddressNotAllowed();
        treasuryAddress = _treasuryAddress;
        emit NewTreasuryAddress(_treasuryAddress);
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
    function claimable(bytes32 predictionId, address user) public view returns (bool) {
        BetInfo memory betInfo = ledger[predictionId][user];
        PredictionRound memory prediction = predictions[predictionId];

        if (prediction.outcome == Outcome.DRAW) {
            return true;
        }

        return
            prediction.resolved &&
            betInfo.units != 0 &&
            !betInfo.claimed &&
            ((prediction.outcome == Outcome.Left && betInfo.position == Position.Left) ||
                (prediction.outcome == Outcome.Right && betInfo.position == Position.Right));
    }

    /**
     * @dev Calculates the rewards for a resolved prediction.
     */
    function _calculateRewards(bytes32 predictionId) internal {
        if (predictions[predictionId].rewardBaseUnits != 0 || predictions[predictionId].rewardAmount != 0) revert RoundNotBettable();
        PredictionRound storage prediction = predictions[predictionId];
        uint256 rewardBaseUnits;
        uint256 treasuryAmt;
        uint256 rewardAmount;

        if (prediction.outcome == Outcome.Left) {
            rewardBaseUnits = prediction.leftUnits;
            treasuryAmt = (prediction.rightUnits * stakeUnit * treasuryFee) / 10000;
            rewardAmount = prediction.rightUnits * stakeUnit - treasuryAmt;
        } else if (prediction.outcome == Outcome.Right) {
            rewardBaseUnits = prediction.rightUnits;
            treasuryAmt = (prediction.leftUnits * stakeUnit * treasuryFee) / 10000;
            rewardAmount = prediction.leftUnits * stakeUnit - treasuryAmt;
        } else if (prediction.outcome == Outcome.DRAW) {
            rewardBaseUnits = 0;
            rewardAmount = 0;
            treasuryAmt = 0;
        } else if (prediction.outcome == Outcome.ERROR) {
            rewardBaseUnits = 0;
            rewardAmount = 0;
            treasuryAmt = 0;
        }

        prediction.rewardBaseUnits = rewardBaseUnits;
        prediction.rewardAmount = rewardAmount;
        treasuryAmount += treasuryAmt;

        emit RewardsCalculated(predictionId, rewardBaseUnits, rewardAmount, treasuryAmt);
    }

    /**
     * @dev Safely ends a prediction with the given outcome.
     */
    function _safeEndPrediction(bytes32 predictionId, Outcome outcome) internal {
        if (predictions[predictionId].endTimestamp == 0) revert RoundNotBettable();
        if (block.timestamp < predictions[predictionId].resolutionTimestamp) revert CannotResolveBeforeResolution();

        PredictionRound storage prediction = predictions[predictionId];
        prediction.outcome = outcome;
        prediction.resolved = true;

        emit EndPrediction(predictionId, outcome);
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
