// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { ChainLinkGemunionV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkGemunionV2.sol";

import { IERC721LootBox, BoxConfig, Request } from "./interfaces/IERC721LootBox.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { TopUp } from "../../utils/TopUp.sol";
import { Asset, DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721_LOOT_ID } from "../../utils/interfaces.sol";
import { MethodNotSupported, NoContent } from "../../utils/errors.sol";

abstract contract ERC721LootBoxSimple is IERC721LootBox, ERC721Simple, TopUp {
  using Address for address;

  mapping(uint256 => Asset[]) internal _itemData;
  mapping(uint256 => Request) internal _queue;
  mapping(uint256 => BoxConfig[]) internal _boxConfig;

  event UnpackLootBox(address account, uint256 tokenId);

  error InvalidMinMax();
  error InvalidConfigLen();

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC721Simple(name, symbol, royalty, baseTokenURI)
  {}

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) {
    revert MethodNotSupported();
  }

  function mintBox(address account, uint256 templateId, Asset[] memory items, BoxConfig[] calldata boxConfig) external onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    uint256 length = items.length;
    if (length == 0) {
      revert NoContent();
    }

    uint256 configLength = boxConfig.length;
    if (configLength != length) {
      revert InvalidConfigLen();
    }

    // Min suppose to be less or equal than max
    // Max suppose to be less or equal than length
    for (uint256 i = 0; i < length; ) {
      if (boxConfig[i].min > boxConfig[i].max || boxConfig[i].max == 0 ) {
        revert InvalidMinMax();
      }
      unchecked {
        i++;
      }
    }

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _boxConfig[tokenId] = boxConfig;

    for (uint256 i = 0; i < configLength; ) {
      _boxConfig[tokenId].push(boxConfig[i]);
      unchecked {
        i++;
      }
    }

    // UnimplementedFeatureError: Copying of type struct Asset memory[] memory to storage not yet supported.
    // _itemData[tokenId] = items;

    for (uint256 i = 0; i < length; ) {
      _itemData[tokenId].push(items[i]);
      unchecked {
        i++;
      }
    }
  }

  function unpack(uint256 tokenId) public virtual {
    _checkAuthorized(_ownerOf(tokenId), _msgSender(), tokenId);

    emit UnpackLootBox(_msgSender(), tokenId);

    _burn(tokenId);

    BoxConfig[] storage minMax = _boxConfig[tokenId];
    uint256 itemsLength = minMax.length;
    uint256 minMaxSum = 0;

    // if ALL min == max, no need to call random function.
    for (uint256 i = 0; i < itemsLength; i++) {
      minMaxSum = minMaxSum + minMax[i].max - minMax[i].min;
    }

    if (minMaxSum == 0 ) {
      ExchangeUtils.acquire(
        _itemData[tokenId],
        _msgSender(),
        DisabledTokenTypes(false, false, false, false, false)
      );
    } else {
      _queue[getRandomNumber()] = Request(_msgSender(), tokenId);
    }
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual {
    Request memory request = _queue[requestId];
    uint256 tokenId = request.tokenId;

    delete _queue[requestId];

    uint256 randomValue = randomWords[0];

    BoxConfig[] storage boxConfig = _boxConfig[tokenId]; // get min-max[] config

    Asset[] storage items = _itemData[tokenId]; // get items[]
    uint256 itemsLength = items.length; // store in separate variable to save gas.

    // Array of items, that would plan to be minted (if random amount > 0)
    Asset[] memory itemsToMint = new Asset[](itemsLength);

    // Count items with non-zero amounts
    uint256 nonZeroCount = 0;

    for (uint256 i = 0; i < itemsLength; i++) {

      uint128 boxMax = boxConfig[i].max;
      uint128 boxMin = boxConfig[i].min;

      // Get Item's randomValue for between min & max;
      uint256 actualCount = boxMax != boxMin ? ((randomValue % (boxMax - boxMin + 1)) + boxMin) : boxMax;

      if ( actualCount > 0 ) {
        itemsToMint[i] = items[i];
        itemsToMint[i].amount = actualCount;
        unchecked {
          nonZeroCount++;
        }
      }
    }

    // Array of items, that would be actually minted (non-zero amounts)
    Asset[] memory itemsToMintNZ = new Asset[](nonZeroCount);

    for (uint256 i = 0; i < nonZeroCount; i++) {
      if (itemsToMint[i].amount > 0) {
        itemsToMintNZ[i] = itemsToMint[i];
      }
    }

    // Mint items with random amounts.
    ExchangeUtils.acquire(
      itemsToMintNZ,
      request.account,
      DisabledTokenTypes(false, false, false, false, false)
    );
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Simple, TopUp) returns (bool) {
    return interfaceId == IERC721_LOOT_ID || super.supportsInterface(interfaceId);
  }

  /**
   * @dev Restrict the contract to receive Ether (receive via topUp function only).
   */
  receive() external payable override(ERC721Simple, TopUp) {
    revert();
  }
}
