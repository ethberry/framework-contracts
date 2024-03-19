// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Asset} from "../../../Exchange/lib/interfaces/IAsset.sol";

struct LotteryConfig {
  uint256 timeLagBeforeRelease;
  uint256 commission;
}

// TODO add more data?
struct LotteryRoundInfo {
  uint256 roundId;
  uint256 startTimestamp;
  uint256 endTimestamp;
  uint256 maxTicket;
  uint256 balance; // left after get prize
  uint256 total; // max money before
  uint8[6] values; // prize numbers
  uint8[7] aggregation; // prize counts
  Asset acceptedAsset;
  Asset ticketAsset;
}
