// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721BoxErrors } from "../../../ERC721/interfaces/IERC721BoxErrors.sol";

interface IERC721Wrapper is IERC721BoxErrors {
  event UnpackWrapper(address account, uint256 tokenId);

  function mintBox(address to, uint256 templateId, Asset[] memory items) external payable;

  function unpack(uint256 tokenId) external;
}
