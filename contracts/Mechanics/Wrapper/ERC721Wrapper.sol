// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AllTypesHolder } from "@ethberry/contracts-finance/contracts/Holder.sol";
import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { IERC721Wrapper } from "./interfaces/IERC721Wrapper.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, TokenType, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";

contract ERC721Wrapper is IERC721Wrapper, ERC721Simple, AllTypesHolder {
  mapping(uint256 => Asset[]) internal _itemData;

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) returns (uint256) {
    revert MethodNotSupported();
  }

  function mintBox(address account, uint256 templateId, Asset[] memory content) external payable onlyRole(MINTER_ROLE) returns (uint256) {
    if (content.length == 0) {
      revert NoContent();
    }
    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _itemData[tokenId] = content;

    uint256 tokenId = _mintCommon(account, templateId);

    uint256 length = content.length;
    for (uint256 i = 0; i < length; ) {
      _itemData[tokenId].push(content[i]);
      unchecked {
        i++;
      }
    }

    ExchangeUtils.spendFrom(content, _msgSender(), address(this), AllowedTokenTypes(true, true, true, true, true));

    return tokenId;
  }

  function unpack(uint256 tokenId) public {
    _checkAuthorized(_ownerOf(tokenId), _msgSender(), tokenId);

    emit UnpackWrapper(_msgSender(), tokenId);

    _burn(tokenId);

    ExchangeUtils.spend(_itemData[tokenId], _msgSender(), AllowedTokenTypes(true, true, true, true, true));
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721Simple, AllTypesHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
