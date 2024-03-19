// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {GENES} from "@gemunion/contracts-utils/contracts/attributes.sol";
import {MINTER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {TemplateZero, MethodNotSupported} from "../utils/errors.sol";
import {TraitsDnD} from "../Mechanics/Traits/TraitsDnD.sol";
import {Rarity} from "../Mechanics/Rarity/Rarity.sol";
import {IERC721Random} from "./interfaces/IERC721Random.sol";
import {ERC721Simple} from "./ERC721Simple.sol";

abstract contract ERC721Genes is IERC721Random, ERC721Simple, TraitsDnD, Rarity {
  using SafeCast for uint;

  struct Request {
    address account;
    uint32 templateId;
    uint32 matronId;
    uint32 sireId;
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

  function mintRandom(address account, uint256 templateId) external override onlyRole(MINTER_ROLE) {
    if (templateId == 0) {
      revert TemplateZero();
    }

    (uint256 childId, uint256 matronId, uint256 sireId) = decodeData(templateId);

    _queue[getRandomNumber()] = Request(account, childId.toUint32(), matronId.toUint32(), sireId.toUint32());
  }

  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintRandom(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    _upsertRecordField(_nextTokenId, GENES, encodeData(request, randomWords[0]));

    delete _queue[requestId];

    _mintCommon(request.account, request.templateId);
  }

  function decodeData(uint256 externalId) internal pure returns (uint256 childId, uint256 matronId, uint256 sireId) {
    childId = uint256(uint32(externalId));
    matronId = uint256(uint32(externalId >> 32));
    sireId = uint256(uint32(externalId >> 64));
  }

  function encodeData(Request memory req, uint256 randomness) internal pure returns (uint256 traits) {
    traits |= uint256(req.matronId);
    traits |= uint256(req.sireId) << 32;
    traits |= uint256(uint192(randomness)) << 64;
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC721Random).interfaceId || super.supportsInterface(interfaceId);
  }
}
