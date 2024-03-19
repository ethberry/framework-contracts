// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;
import {Asset} from "../../../Exchange/lib/interfaces/IAsset.sol";

interface IERC721Wrapper {
  event UnpackWrapper(uint256 tokenId);

  function mintBox(address to, uint256 templateId, Asset[] memory items) external payable;

  function unpack(uint256 tokenId) external;
}
