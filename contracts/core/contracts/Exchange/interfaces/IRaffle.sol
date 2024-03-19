// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IRaffle {
  function printTicket(
    uint256 externalId,
    address account
  ) external returns (uint256 tokenId, uint256 roundId, uint256 index);
}
