// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import { ERC1155ABS } from "@ethberry/contracts-erc1155/contracts/preset/ERC1155ABS.sol";
import { ERC1155ABSR } from "@ethberry/contracts-erc1155/contracts/preset/ERC1155ABSR.sol";
import { ERC1155ABaseUrl } from "@ethberry/contracts-erc1155/contracts/extensions/ERC1155ABaseUrl.sol";

contract ERC1155Simple is ERC1155ABSR, ERC1155ABaseUrl {
  constructor(uint96 royaltyNumerator, string memory baseTokenURI) ERC1155ABSR(royaltyNumerator, baseTokenURI) {}

  function uri(uint256 tokenId) public view virtual override returns (string memory) {
    return url(super.uri(tokenId));
  }

  function _update(
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts
  ) internal virtual override(ERC1155, ERC1155ABS) {
    super._update(from, to, ids, amounts);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155ABSR, ERC1155ABaseUrl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
