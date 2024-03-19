// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Asset} from "../../../Exchange/lib/interfaces/IAsset.sol";

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
