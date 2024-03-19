// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {ERC4907} from "@gemunion/contracts-erc721/contracts/extensions/ERC4907.sol";
import {METADATA_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {ERC998Simple} from "./ERC998Simple.sol";

contract ERC998Rentable is ERC998Simple, ERC4907 {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC998Simple(name, symbol, royalty, baseTokenURI) {}

  function setUser(uint256 tokenId, address user, uint64 expires) public override onlyRole(METADATA_ROLE) {
    super.setUser(tokenId, user, expires);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC998Simple, ERC4907) returns (bool) {
    return ERC998Simple.supportsInterface(interfaceId) || ERC4907.supportsInterface(interfaceId);
  }

  /**
   * @dev See {IERC721-ownerOf}.
   */
  function ownerOf(uint256 tokenId) public view virtual override(ERC721, ERC998Simple) returns (address) {
    return super.ownerOf(tokenId);
  }

  /**
   * @dev See {IERC721-isApprovedForAll}.
   */
  function isApprovedForAll(
    address owner,
    address operator
  ) public view virtual override(ERC721, ERC998Simple) returns (bool) {
    return super.isApprovedForAll(owner, operator);
  }

  /**
   * @dev See {IERC721-getApproved}.
   */
  function getApproved(uint256 tokenId) public view virtual override (ERC721, ERC998Simple) returns (address) {
    return super.getApproved(tokenId);
  }

  /**
   * @dev See {IERC721-approve}.
   */
  function approve(address to, uint256 tokenId) public virtual override(ERC721, ERC998Simple) {
    super.approve(to, tokenId);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override(ERC721, ERC998Simple) {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_update}.
   */
  function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC998Simple, ERC4907) returns (address) {
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override(ERC721, ERC998Simple) returns (string memory) {
    return super._baseURI();
  }
}
