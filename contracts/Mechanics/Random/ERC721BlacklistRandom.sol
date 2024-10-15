// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE, METADATA_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { RARITY } from "@ethberry/contracts-utils/contracts/attributes.sol";

import { ERC721Blacklist } from "../../ERC721/ERC721Blacklist.sol";
import { IERC721Random } from "./interfaces/IERC721Random.sol";
import { Rarity } from "./Rarity.sol";

abstract contract ERC721BlacklistRandom is IERC721Random, ERC721Blacklist, Rarity {
  struct Request {
    address account;
    uint256 templateId;
  }

  mapping(uint256 => Request) internal _queue;

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Blacklist(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address account, uint256 templateId) public override onlyRole(MINTER_ROLE) returns (uint256) {
    uint256 tokenId = _mintCommon(account, templateId);

    _upsertRecordField(tokenId, RARITY, 0);

    return tokenId;
  }

  function mintRandom(address account, uint256 templateId) external override onlyRole(MINTER_ROLE) {
    // check if receiver is blacklisted
    if (_isBlacklisted(account)) {
      revert BlackListError(account);
    }

    if (templateId == 0) {
      revert TemplateZero();
    }

    _queue[getRandomNumber()] = Request(account, templateId);
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintRandom(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    _upsertRecordField(_nextTokenId, RARITY, _getDispersion(randomWords[0]));

    delete _queue[requestId];

    _mintCommon(request.account, request.templateId);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC721Random).interfaceId || super.supportsInterface(interfaceId);
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);
}
