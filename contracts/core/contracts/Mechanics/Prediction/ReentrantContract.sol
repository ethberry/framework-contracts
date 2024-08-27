// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC1363_RECEIVER_ID } from "@gemunion/contracts-utils/contracts/interfaces.sol";
import { IERC1363Receiver } from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363Receiver.sol";
import "./Prediction.sol";

contract ReentrantBettor {
	Prediction private prediction;
	bool private inAttack;
	uint256 private attackedPredictionId;

	error ClaimReentrancyNotAllowed();

	constructor(address payable predictionAddress) {
		prediction = Prediction(predictionAddress);
	}

	function placeBet(uint256 _predictionId, uint256 multiplier, Prediction.Position position) external payable {
		Prediction.PredictionMatch memory predictionDetails = prediction.getPrediction(_predictionId);
		address token = predictionDetails.betAsset.token;
		uint256 amount = predictionDetails.betAsset.amount * multiplier;

		if (token != address(0)) {
			IERC20(token).approve(address(prediction), amount);
		}
		prediction.placeBet{value: msg.value}(_predictionId, multiplier, position);
	}

	function claim(uint256 _predictionId) external {
		attackedPredictionId = _predictionId;
		prediction.claim(_predictionId);
	}

	receive() external payable {
		if (attackedPredictionId > 0) {
		  uint256 predictionId = attackedPredictionId;
		  attackedPredictionId = 0;
		  (bool success, ) = address(this).call(abi.encodeCall(prediction.claim, predictionId));
		  if (!success) {
			revert ClaimReentrancyNotAllowed();
		  }
		}
	}

	function getPrediction(uint256 _predictionId) external view returns (Prediction.PredictionMatch memory) {
		return prediction.getPrediction(_predictionId);
	}

	function onTransferReceived(
	    address operator,
	    address from,
	    uint256 value,
	    bytes calldata data
	) external returns (bytes4) {
		if (attackedPredictionId > 0) {
		  uint256 predictionId = attackedPredictionId;
		  attackedPredictionId = 0;
		  (bool success, ) = address(this).call(abi.encodeCall(prediction.claim, predictionId));
		  if (!success) {
			revert ClaimReentrancyNotAllowed();
		  }
		}
	    return IERC1363Receiver.onTransferReceived.selector;
	}

	function supportsInterface(
		bytes4 interfaceId
	) public view virtual returns (bool) {
		return interfaceId == IERC1363_RECEIVER_ID;
	}
}
