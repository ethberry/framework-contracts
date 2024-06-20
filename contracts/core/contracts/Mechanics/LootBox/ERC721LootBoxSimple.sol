// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { ChainLinkGemunionV2 } from "@gemunion/contracts-chain-link-v2/contracts/extensions/ChainLinkGemunionV2.sol";

import { IERC721LootBox, MinMax } from "./interfaces/IERC721LootBox.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { TopUp } from "../../utils/TopUp.sol";
import { Asset, DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721_LOOT_ID } from "../../utils/interfaces.sol";
import { MethodNotSupported, NoContent, InvalidSubscription } from "../../utils/errors.sol";
import "hardhat/console.sol";

abstract contract ERC721LootBoxSimple is IERC721LootBox, ERC721Simple, TopUp {
  using Address for address;

  struct Request {
    address account;
    uint256 tokenId;
  }

  mapping(uint256 => Asset[]) internal _itemData;
  mapping(uint256 => Request) internal _queue;
  mapping(uint256 => MinMax) internal _minMax;

  event UnpackLootBox(address account, uint256 tokenId);

  error InvalidMinMax();

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

  function mintBox(address account, uint256 templateId, Asset[] memory items, MinMax calldata minMax) external onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    uint256 length = items.length;
    if (length == 0) {
      revert NoContent();
    }

    // Min suppose to be less or equal than max
    // Max suppose to be less or equal than length
    if (minMax.min > minMax.max || minMax.max > length || minMax.max == 0 ) {
      revert InvalidMinMax();
    }

    _minMax[tokenId] = minMax;

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

    MinMax storage minMax = _minMax[tokenId];

    if (minMax.min == minMax.max && minMax.min == _itemData[tokenId].length) {
      // if min == max and minMax == items.length, no need to call random function.
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
    MinMax storage minMax = _minMax[tokenId];
    Asset[] storage items = _itemData[tokenId];
    uint256 itemsLength = items.length; // store in seperate variable to save gas.

    console.log("RANDOM VALUE:", randomValue);

    // Get randomValue between min & max;
    uint256 actualCount = (randomValue % (minMax.max - minMax.min + 1)) + minMax.min;
    console.log("actualCount:", actualCount);

    // mint all items in the actualCount(max) == items.length;
    if (actualCount == itemsLength) {
       return ExchangeUtils.acquire(
        items,
        request.account,
        DisabledTokenTypes(false, false, false, false, false)
      );
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
        randomValue = uint256(keccak256(abi.encodePacked(randomValue, i+1)));
        uint256 randomIndex = randomValue % (itemsLength - i);
        console.log("RANDOM/AVAILABLE INDEX:", randomIndex, availableIndexes[randomIndex], randomValue);
        // Select the index at the random position (availableIndexes[randomIndex])
        // And grab the Item by this index
        itemsToMint[i] = items[availableIndexes[randomIndex]];
        // Replace the used index with the last available index in the current range
        availableIndexes[randomIndex] = availableIndexes[itemsLength - i - 1];
        console.log("ITEM TO MINT:", uint256(itemsToMint[i].tokenType), itemsToMint[i].token);
    }

    // Mint randomly selected items.
    ExchangeUtils.acquire(
      itemsToMint,
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
