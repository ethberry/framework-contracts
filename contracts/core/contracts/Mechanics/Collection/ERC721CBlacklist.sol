// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.13;

import "@ethberry/contracts-access/contracts/extension/BlackList.sol";

import "./ERC721CSimple.sol";

contract ERC721CBlacklist is ERC721CSimple, BlackList {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI,
    uint96 batchSize,
    address owner
  ) ERC721CSimple(name, symbol, royalty, baseTokenURI, batchSize, owner) {}

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721CSimple, BlackList) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {ERC721-_update}.
   */
  function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
    address from = super._update(to, tokenId, auth);

    if (from != address(0) && _isBlacklisted(from)) {
      revert BlackListError(from);
    }

    if (to != address(0) && _isBlacklisted(to)) {
      revert BlackListError(to);
    }

    return from;
  }
}
