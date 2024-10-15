// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import "./IERC721GenesErrors.sol";

interface IERC721Genes is IERC721GenesErrors {
  event MintGenes(uint256 requestId, address to, uint256[] randomWords, uint256 templateId, uint256 tokenId);

  function mintGenes(address account, uint256 templateId, uint256 genes) external returns (uint256);
  function breed(address account, uint256 motherId, uint256 fatherId) external;
}
