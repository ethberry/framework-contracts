// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IRaffleErrors } from "./IRaffleErrors.sol";

interface IRaffle is IRaffleErrors {
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

  // TODO add more data?
  struct RaffleRoundInfo {
    uint256 roundId;
    uint256 startTimestamp;
    uint256 endTimestamp;
    uint256 maxTicket;
    uint256 prizeNumber; // prize number
    Asset acceptedAsset;
    Asset ticketAsset;
  }

  function printTicket(uint256 externalId, address account) external returns (uint256);
}
