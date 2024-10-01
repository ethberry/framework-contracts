// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { RARITY } from "@ethberry/contracts-utils/contracts/attributes.sol";
import { TEMPLATE_ID } from "@ethberry/contracts-utils/contracts/attributes.sol";

import { IERC721Random } from "./interfaces/IERC721Random.sol";
import { ERC721Simple } from "./ERC721Simple.sol";
import { Rarity } from "../Mechanics/Rarity/Rarity.sol";

abstract contract ERC721Random is IERC721Random, ERC721Simple, Rarity {
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
  ) ERC721Simple(name, symbol, royalty, baseTokenURI) {}

  function mintCommon(address account, uint256 templateId) public override(ERC721Simple) onlyRole(MINTER_ROLE) {
    uint256 tokenId = _mintCommon(account, templateId);

    _upsertRecordField(tokenId, RARITY, 0);
  }

  function mintRandom(address account, uint256 templateId) external override onlyRole(MINTER_ROLE) {
    if (templateId == 0) {
      revert TemplateZero();
    }

    _queue[getRandomNumber()] = Request(account, templateId);
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintRandom(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    _upsertRecordField(_nextTokenId, TEMPLATE_ID, request.templateId);
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
