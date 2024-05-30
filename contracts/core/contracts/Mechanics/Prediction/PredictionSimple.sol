// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;
import "hardhat/console.sol";

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { Wallet } from "@gemunion/contracts-mocks/contracts/Wallet.sol";
import { MINTER_ROLE, PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { Asset, DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
// import { ZeroBalance, NotComplete, WrongRound, BalanceExceed, WrongToken, NotAnOwner, Expired, NotActive, LimitExceed } from "../../utils/errors.sol";

struct PredictionConfig {
  uint256 commission;
}

enum Answer { Draw, Yes, No }

contract PredictionSimple is AccessControl, Pausable, Wallet {
    
    uint256 internal immutable comm; // commission 30%


    struct Question {
        // uint256 startTimestamp;
        uint256 endTimestamp; 
        string question;
        uint256 balance; // left after get prize
        uint256 total; // max money before
        uint256 maxAnswers;
        Asset acceptedAsset;
        // Asset ticketAsset;
        Answer[] answers; // all question tickets
        Answer answer;
        bool isFinilised;
        bool isReleased; // funds are released by admin
    }

    uint256 private _totalCommision;

    Question[] private _questions;

    event QuestionCreated(Asset price, uint256 questionId, string question, uint256 maxAnswers, uint256 endTimestamp);
    event PlaceAnswer(uint256 questionId, Answer answer, address account);
    event QuestionFinilised(uint256 questionId, Answer answer);
    event Prize(address account, uint256 questionId, uint256 amount);
    event Released(uint256 questionId, uint256 amount);

    // questionId => Answer => amount.
    mapping(uint256 => mapping(uint8 => uint256)) _questionAnswerTotal; 
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) _questionAnswerAccountTotal;


    constructor(PredictionConfig memory predictionConfig) {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(PAUSER_ROLE, _msgSender());
        _grantRole(MINTER_ROLE, _msgSender());

        comm = predictionConfig.commission;
    }

    function createQuestion(Asset memory price, string memory question, uint256 maxAnswers, uint256 endTimestamp) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Question storage newQuestion = _questions.push();
        
        newQuestion.question = question;
        newQuestion.endTimestamp = endTimestamp;
        newQuestion.acceptedAsset = price;
        newQuestion.maxAnswers = maxAnswers;
        newQuestion.endTimestamp = endTimestamp;

        emit QuestionCreated(price, _questions.length - 1, question, maxAnswers, endTimestamp);
    }

    function placeAnswer(uint256 questionId, Answer answer, address account) external onlyRole(MINTER_ROLE) {
        require(questionId < _questions.length, "Invalid question ID");
        Question storage question = _questions[questionId];
        require(question.endTimestamp == 0 || block.timestamp < question.endTimestamp, "Betting period is over");
        require(!question.isFinilised, "Question already answered");
        require(question.maxAnswers == 0 || question.answers.length < question.maxAnswers, "React max answers");
        require(answer != Answer.Draw, "Invalid Answer");

        question.answers.push(answer);
        // Increase total amount of question => Answer (in order to calculate)
        _questionAnswerTotal[questionId][uint8(answer)]++;
        _questionAnswerAccountTotal[questionId][uint8(answer)][account]++;

        question.balance += question.acceptedAsset.amount;
        question.total += question.acceptedAsset.amount;

        emit PlaceAnswer(questionId, answer, account);
    }

    function finalizeQuestion(uint256 questionId, Answer answer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(questionId < _questions.length, "Invalid question ID");
        Question storage question = _questions[questionId];
        
        require(block.timestamp > question.endTimestamp, "Betting period is not finished");
        require(!question.isFinilised, "Question already answered");

        question.isFinilised = true;
        question.answer = answer;

        emit QuestionFinilised(questionId, answer);
    }

    function getPrize(uint256 questionId) external {
        require(questionId < _questions.length, "Invalid question ID");
        Question storage question = _questions[questionId];
        require(question.isFinilised, "Question not finished yet");
        
        uint8 answer = uint8(question.answer);
        uint256 wins;
        if(answer == 0) { 
            // if Answer was Draw
            wins += _questionAnswerAccountTotal[questionId][1][_msgSender()]; // Answer.Yes
            wins += _questionAnswerAccountTotal[questionId][2][_msgSender()]; // Answer.No
            _questionAnswerAccountTotal[questionId][1][_msgSender()] = 0; // Answer.Yes
            _questionAnswerAccountTotal[questionId][2][_msgSender()] = 0; // Answer.No
        } else {
            wins = _questionAnswerAccountTotal[questionId][answer][_msgSender()];
            _questionAnswerAccountTotal[questionId][answer][_msgSender()] = 0;
        }

        require(wins != 0, "You doesn't ween anything");

        // TODO - calculate winning amount with commision.
        uint256 prizeAmount;
        if(answer == 0) {
            prizeAmount = question.total / question.answers.length * wins;
        } else {
            uint256 totalPrizeAmount = question.total - _calculateCommision(question);
            uint256 amountOfWinners = _questionAnswerTotal[questionId][answer];
            prizeAmount = totalPrizeAmount / amountOfWinners * wins;
        }

        Asset memory price = question.acceptedAsset;
        price.amount = prizeAmount;
        ExchangeUtils.spend(ExchangeUtils._toArray(price), _msgSender(), DisabledTokenTypes(false, false, false, false, false));

        emit Prize(_msgSender(), questionId, prizeAmount);
    }

    function releaseFunds(uint256 questionId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(questionId < _questions.length, "Invalid question ID");
        Question storage question = _questions[questionId];
        require(question.isFinilised, "Question not finished yet");
        require(!question.isReleased, "Funds already released");
        require(question.answer != Answer.Draw, "This question doesn't have...");

        uint256 commision = _calculateCommision(question);

        Asset memory price = question.acceptedAsset;
        price.amount = commision;
        ExchangeUtils.spend(ExchangeUtils._toArray(price), _msgSender(), DisabledTokenTypes(false, false, false, false, false));

        emit Released(questionId, commision);
    }

    function _calculateCommision(Question memory question) internal view returns(uint256) {
        return question.total * comm / 100;
    }

    function getQuestionInfo(uint256 questionId) public view returns(Question memory) {
        require(questionId < _questions.length, "Invalid question ID");
        Question storage question = _questions[questionId];
        return Question(
            question.endTimestamp,
            question.question,
            question.balance,
            question.total,
            question.maxAnswers,
            question.acceptedAsset,
            question.answers,
            question.answer,
            question.isFinilised,
            question.isReleased
        );
    }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, Wallet) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}