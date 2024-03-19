// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IERC721Random {
  event MintRandomV2(uint256 requestId, address to, uint256[] randomWords, uint256 templateId, uint256 tokenId);

  function mintRandom(address account, uint256 templateId) external;
}
