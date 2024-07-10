// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC721, IERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import { ERC998ERC721 } from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC721.sol";
import { WhiteListChild } from "@gemunion/contracts-erc998td/contracts/extensions/WhiteListChild.sol";
import { IWhiteListChild } from "@gemunion/contracts-erc998td/contracts/interfaces/IWhiteListChild.sol";
import { ERC721ABER } from "@gemunion/contracts-erc721e/contracts/preset/ERC721ABER.sol";

import { ERC721Simple } from "../ERC721/ERC721Simple.sol";

contract ERC998Simple is ERC721Simple, ERC998ERC721, WhiteListChild {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  /**
   * @dev See {IERC721-ownerOf}.
   */
  function ownerOf(uint256 tokenId) public view virtual override(IERC721, ERC721) returns (address) {
    return super.ownerOf(tokenId);
  }

  /**
   * @dev See {IERC721-isApprovedForAll}.
   */
  function isApprovedForAll(
    address owner,
    address operator
  ) public view virtual override(IERC721, ERC721) returns (bool) {
    return super.isApprovedForAll(owner, operator);
  }

  /**
   * @dev See {IERC721-approve}.
   */
  function approve(address to, uint256 _tokenId) public virtual override(IERC721, ERC721, ERC998ERC721) {
    ERC998ERC721.approve(to, _tokenId);
  }

  /**
   * @dev See {IERC721-getApproved}.
   */
  function getApproved(uint256 _tokenId) public view virtual override(IERC721, ERC721, ERC998ERC721) returns (address) {
    return ERC998ERC721.getApproved(_tokenId);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721Simple, ERC998ERC721) returns (bool) {
    return type(IWhiteListChild).interfaceId == interfaceId || super.supportsInterface(interfaceId);
  }

  function removeChild(
    uint256 _tokenId,
    address _childContract,
    uint256 _childTokenId
  ) internal override virtual onlyWhiteListedWithDecrement(_childContract) {
    super.removeChild(_tokenId, _childContract, _childTokenId);
  }

  function receiveChild(
    address _from,
    uint256 _tokenId,
    address _childContract,
    uint256 _childTokenId
  ) internal override virtual onlyWhiteListedWithIncrement(_childContract) {
    super.receiveChild(_from, _tokenId, _childContract, _childTokenId);
  }

  /**
   * @dev See {ERC721-_update}.
   */
  function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721ABER, ERC998ERC721) returns (address) {
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override(ERC721, ERC721ABER) {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override(ERC721, ERC721Simple) returns (string memory) {
    return super._baseURI();
  }
}
