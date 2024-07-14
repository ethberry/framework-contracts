// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AllTypesHolder } from "@gemunion/contracts-finance/contracts/Holder.sol";
import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { IERC721Wrapper } from "./interfaces/IERC721Wrapper.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset,TokenType,DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { MethodNotSupported, NoContent } from "../../utils/errors.sol";

contract ERC721Wrapper is IERC721Wrapper, ERC721Simple, AllTypesHolder {
  mapping(uint256 => Asset[]) internal _itemData;

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) {
    revert MethodNotSupported();
  }

  function mintBox(address account, uint256 templateId, Asset[] memory items) external payable onlyRole(MINTER_ROLE) {
    if (items.length == 0) {
      revert NoContent();
    }

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _itemData[tokenId] = items;

    uint256 tokenId = _mintCommon(account, templateId);

    uint256 length = items.length;
    for (uint256 i = 0; i < length; ) {
      _itemData[tokenId].push(items[i]);
      unchecked {
        i++;
      }
    }

    ExchangeUtils.spendFrom(items, _msgSender(), address(this), DisabledTokenTypes(false, false, false, false, false));
  }

  function unpack(uint256 tokenId) public {
    _checkAuthorized(_ownerOf(tokenId), _msgSender(), tokenId);

    emit UnpackWrapper(_msgSender(), tokenId);

    _burn(tokenId);

    ExchangeUtils.spend(_itemData[tokenId], _msgSender(), DisabledTokenTypes(false, false, false, false, false));
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
