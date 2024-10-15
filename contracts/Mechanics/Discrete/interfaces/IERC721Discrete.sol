// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { IERC4906 } from "@ethberry/contracts-erc721/contracts/interfaces/IERC4906.sol";

import { IERC721Simple } from "../../../ERC721/interfaces/IERC721Simple.sol";

interface IERC721Discrete is IERC4906 {
  function upgrade(uint256 tokenId, bytes32 attribute) external returns (uint256);
}
