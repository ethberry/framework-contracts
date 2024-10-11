// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { NativeReceiver, CoinHolder } from "@ethberry/contracts-finance/contracts/Holder.sol";
import { MINTER_ROLE, PAUSER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { Asset, TokenType, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { ILottery } from "./interfaces/ILottery.sol";
import { IERC721LotteryTicket, TicketLottery } from "./interfaces/IERC721LotteryTicket.sol";

abstract contract Lottery is ILottery, AccessControl, Pausable, CoinHolder, NativeReceiver {
  using Address for address;
  using SafeERC20 for IERC20;

  uint256 internal immutable _timeLag; // TODO change in production: release after 2592000 seconds = 30 days (dev: 2592)
  uint256 internal immutable fee; // commission 30%

  event RoundStarted(uint256 roundId, uint256 startTimestamp, uint256 maxTicket, Asset ticket, Asset price);
  event RoundEnded(uint256 round, uint256 endTimestamp);
  event RoundFinalized(uint256 round, uint8[6] winValues);
  event Released(uint256 round, uint256 amount);
  event Prize(address account, uint256 roundId, uint256 ticketId, uint256 amount);

  // LOTTERY

  // TODO optimize struct
  struct Round {
    uint256 roundId;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 balance; // left after get prize
    uint256 total; // max money before
    uint256 maxTicket;
    // TODO Asset[]?
    Asset acceptedAsset;
    Asset ticketAsset;
    bytes32[] tickets; // all round tickets
    uint8[6] values; // prize numbers
    uint8[7] aggregation; // prize counts
    uint256 requestId;
  }

  Round[] internal _rounds;

  constructor(LotteryConfig memory config) {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());

    // SET Lottery Config
    _timeLag = config.timeLagBeforeRelease;
    fee = config.commission;

    Round memory rootRound;
    rootRound.startTimestamp = block.timestamp;
    // rootRound.endTimestamp = 0;
    rootRound.endTimestamp = block.timestamp;
    _rounds.push(rootRound);
  }

  // TICKET
  function printTicket(
    uint256 externalId,
    address account,
    bytes32 numbers,
    Asset memory price
  ) external payable onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
    // get current round
    uint256 roundId = _rounds.length - 1;
    Round storage currentRound = _rounds[roundId];

    if (currentRound.endTimestamp != 0) {
      revert LotteryWrongRound();
    }

    if (currentRound.maxTicket > 0 && currentRound.tickets.length >= currentRound.maxTicket) {
      revert LotteryTicketLimitExceed();
    }

    currentRound.tickets.push(numbers);

    currentRound.balance += currentRound.acceptedAsset.amount;
    currentRound.total += currentRound.acceptedAsset.amount;

    ExchangeUtils.spendFrom(
      ExchangeUtils._toArray(price),
      _msgSender(),
      address(this),
      AllowedTokenTypes(true, true, false, false, false)
    );

    return IERC721LotteryTicket(currentRound.ticketAsset.token).mintTicket(account, roundId, externalId, numbers);
  }

  // ROUND
  function startRound(Asset memory ticket, Asset memory price, uint256 maxTicket) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (ticket.tokenType != TokenType.ERC721) {
      revert WrongAsset();
    }

    Round memory prevRound = _rounds[_rounds.length - 1];
    if (prevRound.endTimestamp == 0) {
      revert LotteryRoundNotComplete();
    }

    Round memory nextRound;
    _rounds.push(nextRound);

    uint256 roundId = _rounds.length - 1;

    Round storage currentRound = _rounds[roundId];
    currentRound.roundId = roundId;
    currentRound.startTimestamp = block.timestamp;
    currentRound.maxTicket = maxTicket;
    currentRound.ticketAsset = ticket;
    currentRound.acceptedAsset = price;
    currentRound.endTimestamp = 0;

    emit RoundStarted(roundId, block.timestamp, maxTicket, ticket, price);
  }

  function endRound() external onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 roundNumber = _rounds.length - 1;
    Round storage currentRound = _rounds[roundNumber];

    if (currentRound.endTimestamp != 0) {
      revert LotteryRoundNotActive();
    }

    currentRound.endTimestamp = block.timestamp;
    currentRound.requestId = getRandomNumber();

    uint256 commission = (currentRound.total * fee) / 100;
    currentRound.total -= commission;

    // TODO send round commission to owner

    emit RoundEnded(roundNumber, block.timestamp);
  }

  // GET INFO
  function getCurrentRoundInfo() public view returns (LotteryRoundInfo memory) {
    Round storage round = _rounds[_rounds.length - 1];
    return
      LotteryRoundInfo(
        round.roundId,
        round.startTimestamp,
        round.endTimestamp,
        round.maxTicket,
        round.balance,
        round.total,
        round.values,
        round.aggregation,
        round.acceptedAsset,
        round.ticketAsset
      );
  }

  function getLotteryInfo() public view returns (LotteryConfig memory) {
    return LotteryConfig(_timeLag, fee);
  }

  // RANDOM
  function fulfillRandomWords(uint256, uint256[] calldata randomWords) internal virtual {
    Round storage currentRound = _rounds[_rounds.length - 1];

    // calculate wining numbers
    bool[36] memory tmp1;
    uint256 tmp2 = randomWords[0];
    uint8 i = 0;
    while (i < 6) {
      uint256 number = tmp2 % 36;
      tmp2 = tmp2 / 37;
      if (!tmp1[number]) {
        currentRound.values[i] = uint8(number);
        tmp1[number] = true;
        i++;
        // TODO unchecked
      }
    }

    // aggregate data
    uint256 len = currentRound.tickets.length;
    for (uint8 l = 0; l < len; l++) {
      uint8 result = countMatch(currentRound.tickets[l], currentRound.values);
      currentRound.aggregation[result]++;
    }

    emit RoundFinalized(currentRound.roundId, currentRound.values);
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  // PRIZE
  function getPrize(uint256 tokenId, uint256 roundId) external {
    if (roundId > _rounds.length - 1) {
      revert LotteryWrongRound();
    }

    Round storage ticketRound = _rounds[roundId];

    if (ticketRound.endTimestamp == 0) {
      revert LotteryRoundNotComplete();
    }

    if (block.timestamp > ticketRound.endTimestamp + _timeLag) {
      revert LotteryTicketExpired();
    }

    // TODO OR approved?
    if (IERC721(ticketRound.ticketAsset.token).ownerOf(tokenId) != _msgSender()) {
      revert LotteryNotOwnerNorApproved(_msgSender());
    }

    IERC721LotteryTicket ticketFactory = IERC721LotteryTicket(ticketRound.ticketAsset.token);

    TicketLottery memory data = ticketFactory.getTicketData(tokenId);

    // revert if prize already set
    if (data.prize) {
      revert LotteryWrongToken();
    }

    // revert if token's roundId differs
    if (data.round != roundId) {
      revert LotteryWrongRound();
    }

    // count win numbers
    uint8 result = countMatch(data.numbers, ticketRound.values);

    if (result > 0) {
      uint8[] memory coefficient = new uint8[](7);
      coefficient[0] = 0;
      coefficient[1] = 15;
      coefficient[2] = 50;
      coefficient[3] = 70;
      coefficient[4] = 110;
      coefficient[5] = 140;
      coefficient[6] = 220;

      uint8[7] memory aggregation = ticketRound.aggregation;

      uint256 sumc;
      for (uint8 l = 0; l < 7; l++) {
        uint256 ag = aggregation[l];
        uint256 co = coefficient[l];
        sumc = sumc + (ag * co);
      }

      uint256 point = sumc > 0 ? ticketRound.total / sumc : 0;

      // set PRIZE status = true
      ticketFactory.setTicketData(tokenId);
      // ticketFactory.burn(tokenId);

      // calculate Prize amount
      uint256 amount = point * coefficient[result];

      if (amount > 0) {

        if (amount > ticketRound.total) {
          revert LotteryBalanceExceed();
        }

        ticketRound.balance -= amount;

        ticketRound.acceptedAsset.amount = amount;
        ExchangeUtils.spend(
          ExchangeUtils._toArray(ticketRound.acceptedAsset),
          _msgSender(),
          AllowedTokenTypes(true, true, false, false, true)
        );
      }

      emit Prize(_msgSender(), roundId, tokenId, amount);
    } else {
      // TODO burn token if no prize?
      // ticketFactory.burn(tokenId);
      revert LotteryWrongToken();
    }
  }

  // RELEASE BALANCE
  function releaseFunds(uint256 roundNumber) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (roundNumber > _rounds.length - 1) {
      revert LotteryWrongRound();
    }

    Round storage ticketRound = _rounds[roundNumber];

    if (ticketRound.balance == 0) {
      revert LotteryZeroBalance();
    }

    uint8[7] memory aggregation = ticketRound.aggregation;

    // check if round has any winners
    bool hasWinners = false;
    for (uint8 l = 1; l < 7; l++) {
      hasWinners = aggregation[l] > 0;
    }

    // TODO can be called on unfinished round
    if (hasWinners && block.timestamp < ticketRound.endTimestamp + _timeLag) {
      revert LotteryRoundNotComplete();
    }

    // RELEASE ALL ROUND BALANCE
    uint256 roundBalance = ticketRound.balance;
    ticketRound.balance = 0;

    ticketRound.acceptedAsset.amount = roundBalance;
    ExchangeUtils.spend(
      ExchangeUtils._toArray(ticketRound.acceptedAsset),
      _msgSender(),
      AllowedTokenTypes(true, true, false, false, true)
    );

    emit Released(roundNumber, roundBalance);
  }

  // COUNT TICKET MATCH
  function countMatch(bytes32 ticketNumbers, uint8[6] memory values) internal virtual returns (uint8) {
    uint8 ticketMatch = 0;

    for (uint8 j = 0; j < 6; j++) {
      for (uint8 k = 0; k < 6; k++) {
        if (uint8(ticketNumbers[31 - k]) == values[j]) {
          ticketMatch++;
          break;
        }
      }
    }

    return ticketMatch;
  }

  // PAUSABLE
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
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl, CoinHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
