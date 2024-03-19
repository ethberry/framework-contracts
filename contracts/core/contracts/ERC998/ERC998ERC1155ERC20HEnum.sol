// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {ERC998ERC1155Enumerable} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC1155Enumerable.sol";
import {ERC998ERC20Enumerable} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC20Enumerable.sol";
import {ERC998Utils} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998Utils.sol";
import {StateHash} from "@gemunion/contracts-erc998td/contracts/extensions/StateHash.sol";
import {ERC998ERC721} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC721.sol";
import {ERC998ERC20} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC20.sol";
import {ERC998ERC1155} from "@gemunion/contracts-erc998td/contracts/extensions/ERC998ERC1155.sol";

import {ERC998SimpleEnum} from "./ERC998SimpleEnum.sol";

contract ERC998ERC1155ERC20HEnum is
  ERC998SimpleEnum,
  ERC998ERC1155Enumerable,
  ERC998ERC20Enumerable,
  StateHash
{
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC998SimpleEnum(name, symbol, royalty, baseTokenURI) {}

  /**
   * @dev See {IERC721-ownerOf}.
   */
  function ownerOf(
    uint256 tokenId
  ) public view virtual override(ERC721, ERC998SimpleEnum) returns (address) {
    return super.ownerOf(tokenId);
  }

  function _ownerOrApproved(address sender, uint256 tokenId) internal view override(ERC998ERC721, ERC998Utils) {
    super._ownerOrApproved(sender, tokenId);
  }

  function _afterRemoveERC20(
    uint256 _tokenId,
    address _to,
    address _erc20Contract,
    uint256 _value
  ) internal virtual override(ERC998ERC20, StateHash) {
    super._afterRemoveERC20(_tokenId, _to, _erc20Contract, _value);
  }

  function _afterReceivedERC20(
    address _from,
    uint256 _tokenId,
    address _erc20Contract,
    uint256 _value
  ) internal virtual override(ERC998ERC20, StateHash) {
    super._afterReceivedERC20(_from, _tokenId, _erc20Contract, _value);
  }

  function _afterRemoveERC721(
    uint256 _tokenId,
    address _childContract,
    uint256 _childTokenId
  ) internal override(ERC998ERC721, StateHash) {
    super._afterRemoveERC721(_tokenId, _childContract, _childTokenId);
  }

  function _afterReceiveERC721(
    address _from,
    uint256 _tokenId,
    address _childContract,
    uint256 _childTokenId
  ) internal override(ERC998ERC721, StateHash) {
    super._afterReceiveERC721(_from, _tokenId, _childContract, _childTokenId);
  }

  function _afterRemoveERC1155(
    address _operator,
    uint256 _tokenId,
    address _to,
    address _erc1155Contract,
    uint256[] memory _childTokenIds,
    uint256[] memory _amounts,
    bytes memory data
  ) internal virtual override(ERC998ERC1155, StateHash) {
    super._afterRemoveERC1155(_operator, _tokenId, _to, _erc1155Contract, _childTokenIds, _amounts, data);
  }

  function _afterReceiveERC1155(
    address _operator,
    address _from,
    uint256 _tokenId,
    address _erc1155Contract,
    uint256[] memory _childTokenIds,
    uint256[] memory _amounts,
    bytes memory data
  ) internal virtual override(ERC998ERC1155, StateHash) {
    super._afterReceiveERC1155(_operator, _from, _tokenId, _erc1155Contract, _childTokenIds, _amounts, data);
  }

  function _localRootId(uint256 tokenId) internal view override(ERC998ERC721, StateHash) returns (uint256) {
    return super._localRootId(tokenId);
  }

  function _balanceOfERC20(uint256 _tokenId, address _erc20Contract) internal view override(StateHash, ERC998ERC20) returns (uint256) {
    return super._balanceOfERC20(_tokenId, _erc20Contract);
  }

  function _balanceOfERC1155(
    uint256 _tokenId,
    address _erc1155Contract,
    uint256 childTokenId
  ) internal view override(StateHash, ERC998ERC1155) returns (uint256) {
    return super._balanceOfERC1155(_tokenId, _erc1155Contract, childTokenId);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC998SimpleEnum, ERC998ERC1155Enumerable, ERC998ERC20Enumerable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {IERC721-isApprovedForAll}.
   */
  function isApprovedForAll(
    address owner,
    address operator
  ) public view virtual override(ERC721, ERC998SimpleEnum) returns (bool) {
    return super.isApprovedForAll(owner, operator);
  }

  /**
   * @dev See {IERC721-getApproved}.
   */
  function getApproved(uint256 _tokenId) public view virtual override(ERC721, ERC998SimpleEnum) returns (address) {
    return super.getApproved(_tokenId);
  }

  /**
   * @dev See {IERC721-approve}.
   */
  function approve(address to, uint256 _tokenId) public virtual override(ERC721, ERC998SimpleEnum) {
    super.approve(to, _tokenId);
  }

  /**
   * @dev See {ERC721-_update}.
   */
  function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC998SimpleEnum) returns (address) {
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override(ERC721, ERC998SimpleEnum) {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override(ERC721, ERC998SimpleEnum) returns (string memory) {
    return super._baseURI();
  }
}
