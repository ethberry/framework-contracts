// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE, METADATA_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { RARITY, TEMPLATE_ID } from "@gemunion/contracts-utils/contracts/attributes.sol";

import { ProtectedAttribute, TemplateZero } from "../utils/errors.sol";
import { Rarity } from "../Mechanics/Rarity/Rarity.sol";
import { IERC721Random } from "./interfaces/IERC721Random.sol";
import { ERC721BlacklistDiscrete } from "./ERC721BlacklistDiscrete.sol";

abstract contract ERC721BlacklistDiscreteRandom is IERC721Random, ERC721BlacklistDiscrete, Rarity {
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
  ) ERC721BlacklistDiscrete(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address account, uint256 templateId) public override onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    _upsertRecordField(tokenId, RARITY, 0);
  }

  function mintRandom(address account, uint256 templateId) external override onlyRole(MINTER_ROLE) {
    // check if receiver is blacklisted
    if(_isBlacklisted(account)) {
      revert BlackListError(account);
    }

    if (templateId == 0) {
      revert TemplateZero();
    }

    _queue[getRandomNumber()] = Request(account, templateId);
  }

  /**
   * @dev Validates and upgrades attribute
   * @param tokenId The NFT to upgrade
   * @param attribute parameter name
   * @return uint256 The upgraded level
   */
  function upgrade(uint256 tokenId, bytes32 attribute) public virtual override onlyRole(METADATA_ROLE) returns (uint256) {
    // TEMPLATE_ID refers to database id
    // RARITY refers ChainLink integration
    if (attribute == TEMPLATE_ID || attribute == RARITY) {
      revert ProtectedAttribute(attribute);
    }
    return _upgrade(tokenId, attribute);
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintRandom(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    // WE USE ONLY 1 RANDOM WORD uint256
    _upsertRecordField(_nextTokenId, RARITY, _getDispersion(randomWords[0]));

    delete _queue[requestId];
    _mintCommon(request.account, request.templateId);
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC721Random).interfaceId || super.supportsInterface(interfaceId);
  }
}
