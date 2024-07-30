// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { NativeRejector, CoinHolder } from "@gemunion/contracts-finance/contracts/Holder.sol";
import { MINTER_ROLE, PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721RaffleTicket, TicketRaffle } from "./interfaces/IERC721RaffleTicket.sol";
import { RaffleRoundInfo } from "./interfaces/IRaffle.sol";
import { NotInList, WrongToken, WrongRound, NotAnOwner, NotComplete, ZeroBalance, NotActive, NotExist, LimitExceed } from "../../utils/errors.sol";

abstract contract RaffleRandom is AccessControl, Pausable, NativeRejector, CoinHolder {
  using Address for address;

  event RoundStarted(uint256 roundId, uint256 startTimestamp, uint256 maxTicket, Asset ticket, Asset price);
  event RoundEnded(uint256 round, uint256 endTimestamp);
  event RoundFinalized(uint256 round, uint256 prizeIndex, uint256 prizeNumber);
  event Released(uint256 round, uint256 amount);
  event Prize(address account, uint256 roundId, uint256 ticketId, uint256 amount);
  event PaymentEthReceived(address from, uint256 amount);

  // RAFFLE
  struct Round {
    uint256 roundId;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 balance; // left after get prize
    uint256 total; // max money before
    //    Counters.Counter ticketCounter; // all round tickets counter
    uint256[] tickets; // all round tickets ids
    uint256 prizeNumber; // prize number
    uint256 requestId;
    uint256 maxTicket;
    // TODO Asset[]?
    Asset acceptedAsset;
    Asset ticketAsset;
  }

  mapping (uint256 => uint256) private requestToRoundNumber; // requestId => roundNumber

  Round[] internal _rounds;

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());

    Round memory rootRound;
    rootRound.startTimestamp = block.timestamp;
    rootRound.endTimestamp = block.timestamp;
    _rounds.push(rootRound);
  }

  // TICKET
  function printTicket(
    uint256 externalId,
    address account
  ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId, uint256 roundId, uint256 index) {
    // get current round
    roundId = _rounds.length - 1;
    Round storage currentRound = _rounds[roundId];

    if (currentRound.endTimestamp != 0) {
      revert WrongRound();
    }

    // allow all
    if (currentRound.maxTicket > 0 && currentRound.tickets.length >= currentRound.maxTicket) {
      revert LimitExceed();
    }

    currentRound.balance += currentRound.acceptedAsset.amount;
    currentRound.total += currentRound.acceptedAsset.amount;

    tokenId = IERC721RaffleTicket(currentRound.ticketAsset.token).mintTicket(account, roundId, externalId, currentRound.tickets.length + 1);

    // TODO overflow check?
    currentRound.tickets.push(tokenId);

    // serial number of ticket inside round
    index = currentRound.tickets.length;
  }

  function startRound(Asset memory ticket, Asset memory price, uint256 maxTicket) public onlyRole(DEFAULT_ADMIN_ROLE) {
    Round memory prevRound = _rounds[_rounds.length - 1];
    if (prevRound.endTimestamp == 0) revert NotComplete();

    Round memory nextRound;
    _rounds.push(nextRound);

    uint256 roundId = _rounds.length - 1;

    Round storage currentRound = _rounds[roundId];
    currentRound.roundId = roundId;
    currentRound.startTimestamp = block.timestamp;
    currentRound.maxTicket = maxTicket;
    currentRound.ticketAsset = ticket;
    currentRound.acceptedAsset = price;

    emit RoundStarted(roundId, block.timestamp, maxTicket, ticket, price);
  }

  // GETTERS
  function getRoundsCount() public view returns (uint256) {
    return _rounds.length;
  }

  function getRound(uint256 roundId) public view returns (Round memory) {
    if (_rounds.length < roundId) revert NotExist();
    return _rounds[roundId];
  }

  function getCurrentRoundInfo() public view returns (RaffleRoundInfo memory) {
    Round storage round = _rounds[_rounds.length - 1];
    return
      RaffleRoundInfo(
        round.roundId,
        round.startTimestamp,
        round.endTimestamp,
        round.maxTicket,
        round.prizeNumber,
        round.acceptedAsset,
        round.ticketAsset
      );
  }

//  function getLotteryInfo() public view returns (RaffleConfig memory) {
//    return RaffleConfig(_timeLag, comm);
//  }

  // RANDOM
  function getRandomNumber() internal virtual returns (uint256 requestId);

  function endRound() external onlyRole(DEFAULT_ADMIN_ROLE) {
    uint256 roundNumber = _rounds.length - 1;
    Round storage currentRound = _rounds[roundNumber];

    // TODO should never happen?
    if (currentRound.roundId != roundNumber) {
      revert WrongRound();
    }

    if (currentRound.endTimestamp != 0) {
      revert NotActive();
    }

    currentRound.endTimestamp = block.timestamp;
    uint256 len = currentRound.tickets.length;

    if (len == 1) {
      // only one ticket sold, so he is the winner.
      _roundFinalized(currentRound, 0);
    } else if (len > 1) {
      // If more than one ticket sold, we have to call random function to figure out who is the winner
      currentRound.requestId = getRandomNumber();
      requestToRoundNumber[currentRound.requestId] = roundNumber;
    } else {
     emit RoundFinalized(currentRound.roundId, 0, 0); // roundId, prizeIndex, prizeNumber
    }// if no ticket sold, we suppose to set endTimestamp and no need emit RoundFinalized

    emit RoundEnded(roundNumber, block.timestamp);
  }

  function releaseFunds(uint256 roundNumber) external onlyRole(DEFAULT_ADMIN_ROLE) {
    Round storage currentRound = _rounds[roundNumber];

    if (currentRound.balance == 0) {
        revert ZeroBalance();
    }

    uint256 roundBalance = currentRound.balance;
    currentRound.balance = 0;

    currentRound.acceptedAsset.amount = roundBalance;
    ExchangeUtils.spend(
      ExchangeUtils._toArray(currentRound.acceptedAsset),
      _msgSender(),
      AllowedTokenTypes(true, true, true, true, true)
    );

    emit Released(roundNumber, roundBalance);
  }

  // ROUND
  function fulfillRandomWords(uint256 requiestId, uint256[] calldata randomWords) internal virtual {
    uint256 roundNumber = requestToRoundNumber[requiestId];
    Round storage currentRound = _rounds[roundNumber];
    // calculate wining numbers - uint256(uint8(randomWords[0] % tickets.length))
    _roundFinalized(currentRound, uint256(uint8(randomWords[0] % currentRound.tickets.length)));
  }

  function _roundFinalized(Round storage currentRound, uint256 prizeIndex) internal virtual {
    // prizeNumber - winner's tokenId
    // Zero if no tickets sold
    currentRound.prizeNumber = currentRound.tickets[prizeIndex];
    emit RoundFinalized(currentRound.roundId, prizeIndex, currentRound.prizeNumber /* ticket Id = ticket No*/);
  }

  function getPrize(uint256 tokenId, uint256 roundId) external {
    if (roundId > _rounds.length - 1) {
      revert WrongRound();
    }

    Round storage ticketRound = _rounds[roundId];

    if (ticketRound.endTimestamp == 0) {
      revert NotComplete();
    }

    // TODO OR approved?
    if (IERC721(ticketRound.ticketAsset.token).ownerOf(tokenId) != _msgSender()) {
      revert NotAnOwner();
    }

    IERC721RaffleTicket ticketFactory = IERC721RaffleTicket(ticketRound.ticketAsset.token);

    TicketRaffle memory data = ticketFactory.getTicketData(tokenId);

    // check token's roundId
    if (data.round != roundId) {
      revert WrongRound();
    }

    // check token's prize status
    if (data.prize) {
      revert WrongToken();
    }

    // check if tokenId is round winner
    if (tokenId == ticketRound.prizeNumber) {
      // ticketFactory.burn(tokenId);
      // set prize status and multiplier
      ticketFactory.setPrize(tokenId, ticketRound.tickets.length);
      emit Prize(_msgSender(), roundId, tokenId, ticketRound.tickets.length);
    } else {
      revert NotInList();
    }
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
