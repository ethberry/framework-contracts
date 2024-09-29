// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

interface ILotteryErrors {
  error LotteryNotOwnerNorApproved(address account);
  error LotteryWrongRound();
  error LotteryPrizeNotEligible();
  error LotteryTicketLimitExceed();
  error LotteryTicketExpired();
  error LotteryRoundNotComplete();
  error LotteryRoundNotActive();
  error LotteryWrongToken();
  error LotteryBalanceExceed();
  error LotteryZeroBalance();
}
