// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

struct TicketLottery {
  uint256 round; // lottery contract roundId
  uint256 externalId; // db roundId
  bytes32 numbers;
  bool prize;
}

interface IERC721LotteryTicket {
  function mintTicket(address account, uint256 roundId, uint256 externalId, bytes32 numbers) external returns (uint256);

  function burn(uint256 tokenId) external;

  function getTicketData(uint256 tokenId) external view returns (TicketLottery memory);

  function setTicketData(uint256 tokenId) external;
}
