// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IRaffleErrors {
  error RaffleNotOwnerNorApproved(address account);
  error RaffleWrongRound();
  error RafflePrizeNotEligible();
  error RaffleTicketLimitExceed();
  error RaffleTicketExpired();
  error RaffleRoundNotComplete();
  error RaffleRoundNotActive();
  error RaffleWrongToken();
  error RaffleZeroBalance();
}
