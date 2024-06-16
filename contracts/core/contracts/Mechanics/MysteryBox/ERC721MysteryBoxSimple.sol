// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { IERC721MysteryBox } from "./interfaces/IERC721MysteryBox.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { TopUp } from "../../utils/TopUp.sol";
import { Asset, DisabledTokenTypes, TokenType } from "../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721_MYSTERY_ID } from "../../utils/interfaces.sol";
import { MethodNotSupported, NoContent, UnsupportedTokenType } from "../../utils/errors.sol";

contract ERC721MysteryBoxSimple is IERC721MysteryBox, ERC721Simple, TopUp {
  using Address for address;

  mapping(uint256 => Asset[]) internal _itemData;

  event UnpackMysteryBox(address account, uint256 tokenId);

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) {
    revert MethodNotSupported();
  }

  function mintBox(address account, uint256 templateId, Asset[] memory items) external onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    if (items.length == 0) {
      revert NoContent();
    }

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _itemData[tokenId] = items;

    uint256 length = items.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = items[i];
      if (item.tokenType == TokenType.ERC721 || item.tokenType == TokenType.ERC998) {
        _itemData[tokenId].push(items);
      } else {
        revert UnsupportedTokenType();
      }
      unchecked {
        i++;
      }
    }
  }

  function unpack(uint256 tokenId) public virtual {
    _checkAuthorized(_ownerOf(tokenId), _msgSender(), tokenId);

    emit UnpackMysteryBox(_msgSender(), tokenId);

    _burn(tokenId);

    ExchangeUtils.acquire(_itemData[tokenId], _msgSender(), DisabledTokenTypes(true, true, false, false, true));
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Simple, TopUp) returns (bool) {
    return interfaceId == IERC721_MYSTERY_ID || super.supportsInterface(interfaceId);
  }

  /**
   * @dev Restrict the contract to receive Ether (receive via topUp function only).
   */
  receive() external payable override(ERC721Simple, TopUp) {
    revert();
  }
}
