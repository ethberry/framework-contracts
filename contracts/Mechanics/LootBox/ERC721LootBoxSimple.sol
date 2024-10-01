// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { ChainLinkGemunionV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkGemunionV2Plus.sol";
import { AllTypesHolder } from "@ethberry/contracts-finance/contracts/Holder.sol";

import { IERC721LootBox } from "./interfaces/IERC721LootBox.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { TopUp } from "../../utils/TopUp.sol";
import { Asset, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";

abstract contract ERC721LootBoxSimple is IERC721LootBox, ERC721Simple, AllTypesHolder, TopUp {
  using Address for address;

  struct Request {
    address account;
    uint256 tokenId;
  }

  mapping(uint256 => Asset[]) internal _itemData;
  mapping(uint256 => Request) internal _queue;
  mapping(uint256 => LootBoxConfig) internal _boxConfig;

  event UnpackLootBox(address account, uint256 tokenId);

  error InvalidMinMax();

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) {
    revert MethodNotSupported();
  }

  function mintBox(
    address account,
    uint256 templateId,
    Asset[] memory content,
    LootBoxConfig calldata boxConfig
  ) external onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    uint256 length = content.length;
    if (length == 0) {
      revert NoContent();
    }

    // Min suppose to be less or equal than max
    // Max suppose to be less or equal than length
    if (boxConfig.min > boxConfig.max || boxConfig.max > length || boxConfig.max == 0) {
      revert InvalidMinMax();
    }

    _boxConfig[tokenId] = boxConfig;

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _itemData[tokenId] = items;

    for (uint256 i = 0; i < length; ) {
      _itemData[tokenId].push(content[i]);
      unchecked {
        i++;
      }
    }
  }

  function unpack(uint256 tokenId) public virtual {
    _checkAuthorized(_ownerOf(tokenId), _msgSender(), tokenId);

    emit UnpackLootBox(_msgSender(), tokenId);

    _burn(tokenId);

    LootBoxConfig storage minMax = _boxConfig[tokenId];

    if (minMax.min == minMax.max && minMax.min == _itemData[tokenId].length) {
      // if min == max and minMax == items.length, no need to call random function.
      ExchangeUtils.acquire(_itemData[tokenId], _msgSender(), AllowedTokenTypes(true, true, true, true, true));
    } else {
      _queue[getRandomNumber()] = Request(_msgSender(), tokenId);
    }
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];
    uint256 tokenId = request.tokenId;

    delete _queue[requestId];

    uint256 randomValue = randomWords[0];
    LootBoxConfig storage boxConfig = _boxConfig[tokenId];
    Asset[] storage items = _itemData[tokenId];
    uint256 itemsLength = items.length; // store in seperate variable to save gas.

    // Get randomValue between min & max;
    uint256 actualCount = (randomValue % (boxConfig.max - boxConfig.min + 1)) + boxConfig.min;

    // mint all items in the actualCount(max) == items.length;
    if (actualCount == itemsLength) {
      return ExchangeUtils.acquire(items, request.account, AllowedTokenTypes(true, true, true, true, true));
    }

    // Array of items, that would be randomly picked and minted
    Asset[] memory itemsToMint = new Asset[](actualCount);
    // Array of availableIndexes, is used to identify unique indexes
    uint256[] memory availableIndexes = new uint256[](itemsLength);

    // Initialize available indexes
    for (uint256 i = 0; i < itemsLength; i++) {
      availableIndexes[i] = i;
    }

    for (uint256 i = 0; i < actualCount; i++) {
      // Generate a random index within the current range of available indexes
      randomValue = uint256(keccak256(abi.encodePacked(randomValue, i + 1)));
      uint256 randomIndex = randomValue % (itemsLength - i);
      // Select the index at the random position (availableIndexes[randomIndex])
      // And grab the Item by this index
      itemsToMint[i] = items[availableIndexes[randomIndex]];
      // Replace the used index with the last available index in the current range
      availableIndexes[randomIndex] = availableIndexes[itemsLength - i - 1];
    }

    // Mint randomly selected items.
    ExchangeUtils.acquire(itemsToMint, request.account, AllowedTokenTypes(true, true, true, true, true));
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721Simple, AllTypesHolder) returns (bool) {
    return interfaceId == type(IERC721LootBox).interfaceId || super.supportsInterface(interfaceId);
  }
}
