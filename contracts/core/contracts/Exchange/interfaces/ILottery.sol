// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface ILottery {
  function printTicket(
    uint256 externalId,
    address account,
    bytes32 numbers
  ) external returns (uint256 tokenId, uint256 roundId);
}
