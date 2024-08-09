// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { NativeReceiver, CoinHolder } from "@gemunion/contracts-finance/contracts/Holder.sol";

import { Asset, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";

  enum PredictionOutcome {
    YES,
    NO,
    DRAW,
    TECH
  }

contract Prediction is AccessControl, Pausable, NativeReceiver, CoinHolder {
  struct Round {
    uint256 roundId;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 maxTicket;
    uint256 prize;
  }

  Round[] internal _rounds;

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());

    // sets merchants fee
    // sets max time without resolution
  }

  function startRound(Asset memory price, uint256 maxTicket) public onlyRole(DEFAULT_ADMIN_ROLE) {
    // price contains token address and minimal bet
    // should set end time for bets in this round


    // emit RoundStart(roundId, price, maxTicket);
    // returns roundId
  }

  function endRound(uint256 roundId, PredictionOutcome outcome) public onlyRole(DEFAULT_ADMIN_ROLE) {
    // admin withdraws fee
    // precalculate minimal prize

    // emit RoundEnd(Asset(minimal_prize), winners.length);
  }

  function makeBet(uint256 roundId, uint256 multiplicatior) public {
    // withdraws bet
    // bet = price * multiplicatior

    // emit Bet(roundId, _msgSender(), Asset(price * multiplicatior));
  }

  function getPrize(uint256 roundId) public onlyRole(DEFAULT_ADMIN_ROLE) {
    // check if there were bets
    // withdraw minimal prize * multiplicatior
    // if round was not resolved just gets money back
    // emit Withdraw(roundId, Asset(prize * multiplicatior));
  }

  function _calc() internal {
    // precalculates minimal prize based on merchants commission, bet amount and amount of winners
  }


  // PAUSE
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
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, CoinHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
