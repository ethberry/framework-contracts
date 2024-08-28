// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IERC721Genes {
  event MintGenes(uint256 requestId, address to, uint256[] randomWords, uint256 templateId, uint256 tokenId);

  function mintGenes(address account, uint256 templateId, uint256 genes) external;
  function breed(uint256 motherId, uint256 fatherId) external;
}
