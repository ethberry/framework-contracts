// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC1155ABSR} from "@gemunion/contracts-erc1155/contracts/preset/ERC1155ABSR.sol";
import {ERC1155BaseUrl} from "@gemunion/contracts-erc1155/contracts/extensions/ERC1155BaseUrl.sol";

contract ERC1155Simple is ERC1155ABSR, ERC1155BaseUrl {
  constructor(uint96 royaltyNumerator, string memory baseTokenURI) ERC1155ABSR(royaltyNumerator, baseTokenURI) {}

  function uri(uint256 tokenId) public view virtual override returns (string memory) {
    return url(super.uri(tokenId));
  }
}
