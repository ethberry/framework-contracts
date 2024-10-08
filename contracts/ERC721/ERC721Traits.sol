// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { TRAITS } from "../Mechanics/Traits/attributes.sol";
import { TraitsDungeonsAndDragons } from "../Mechanics/Traits/TraitsDnD.sol";
import { IERC721Random } from "../ERC721/interfaces/IERC721Random.sol";
import { IERC721Traits } from "./interfaces/IERC721Traits.sol";
import { ERC721Simple } from "./ERC721Simple.sol";

abstract contract ERC721Traits is IERC721Traits, ERC721Simple, TraitsDungeonsAndDragons {
  using SafeCast for uint;

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

  function mintCommon(address, uint256) external virtual override onlyRole(MINTER_ROLE) {
    revert MethodNotSupported();
  }

  function mintTraits(address account, uint256 templateId) external override onlyRole(MINTER_ROLE) {
    if (templateId == 0) {
      revert TemplateZero();
    }

    _queue[getRandomNumber()] = Request(account, templateId);
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintTraits(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    _upsertRecordField(_nextTokenId, TRAITS, randomWords[0]);

    delete _queue[requestId];

    _mintCommon(request.account, request.templateId);
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC721Traits).interfaceId || super.supportsInterface(interfaceId);
  }
}
