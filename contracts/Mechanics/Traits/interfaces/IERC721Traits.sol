// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

interface IERC721Traits {
  event MintTraits(uint256 requestId, address to, uint256[] randomWords, uint256 templateId, uint256 tokenId);

  function mintTraits(address account, uint256 templateId) external;
}
