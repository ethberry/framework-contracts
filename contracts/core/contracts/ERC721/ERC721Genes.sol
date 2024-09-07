// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import { TEMPLATE_ID } from "@gemunion/contracts-utils/contracts/attributes.sol";
import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { TemplateZero, MethodNotSupported, NotOwnerNorApproved, InvalidGenes } from "../utils/errors.sol";
import { GENES, MOTHER_ID, FATHER_ID, PREGNANCY_COUNTER, PREGNANCY_TIMESTAMP } from "../Mechanics/Genes/attributes.sol";
import { GenesCryptoKitties } from "../Mechanics/Genes/GenesCK.sol";
import { Rarity } from "../Mechanics/Rarity/Rarity.sol";
import { IERC721Genes } from "./interfaces/IERC721Genes.sol";
import { ERC721Simple } from "./ERC721Simple.sol";

abstract contract ERC721Genes is IERC721Genes, ERC721Simple, GenesCryptoKitties, Rarity {
  using SafeCast for uint;

  struct Request {
    address account;
    uint256 motherId;
    uint256 fatherId;
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

  function mintGenes(
    address account,
    uint256 templateId,
    uint256 genes
  ) external override onlyRole(MINTER_ROLE) {
    if (templateId == 0) {
      revert TemplateZero();
    }

    for (uint256 i = 0; i < 256; i += 16) {
      if ((genes >> i) & 0xFFFF == 0) {
        revert InvalidGenes();
      }
    }

    // first generation
    _upsertRecordField(_nextTokenId, MOTHER_ID, 0);
    _upsertRecordField(_nextTokenId, FATHER_ID, 0);
    _upsertRecordField(_nextTokenId, PREGNANCY_COUNTER, 0);
    _upsertRecordField(_nextTokenId, PREGNANCY_TIMESTAMP, 0);
    _upsertRecordField(_nextTokenId, GENES, genes);

    _mintCommon(account, templateId);
  }

  function breed(
    uint256 motherId,
    uint256 fatherId
  ) external {
    if (ownerOf(motherId) != _msgSender() && getApproved(motherId) != _msgSender()) {
      revert NotOwnerNorApproved(_msgSender());
    }

    if (ownerOf(fatherId) != _msgSender() && getApproved(fatherId) != _msgSender()) {
      revert NotOwnerNorApproved(_msgSender());
    }

    _queue[getRandomNumber()] = Request(
      _msgSender(),
      motherId,
      fatherId
    );
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    // child will have moms template id
    uint256 templateId = _getRecordFieldValue(request.motherId, TEMPLATE_ID);

    emit MintGenes(requestId, request.account, randomWords, templateId, _nextTokenId);

    uint256 motherGenes = _getRecordFieldValue(request.motherId, GENES);
    uint256 motherCounter = _getRecordFieldValue(request.motherId, PREGNANCY_COUNTER);
    _upsertRecordField(request.motherId, PREGNANCY_COUNTER, motherCounter + 1);
    _upsertRecordField(request.motherId, PREGNANCY_TIMESTAMP, block.timestamp);

    uint256 fatherGenes = _getRecordFieldValue(request.fatherId, GENES);
    uint256 fatherCounter = _getRecordFieldValue(request.fatherId, PREGNANCY_COUNTER);
    _upsertRecordField(request.fatherId, PREGNANCY_COUNTER, fatherCounter + 1);
    _upsertRecordField(request.fatherId, PREGNANCY_TIMESTAMP, block.timestamp);

    // second+ generation
    _upsertRecordField(_nextTokenId, MOTHER_ID, request.motherId);
    _upsertRecordField(_nextTokenId, FATHER_ID, request.fatherId);
    _upsertRecordField(_nextTokenId, PREGNANCY_COUNTER, 0);
    _upsertRecordField(_nextTokenId, PREGNANCY_TIMESTAMP, 0);
    _upsertRecordField(_nextTokenId, GENES, _mixGenes(motherGenes, fatherGenes, randomWords[0]));

    delete _queue[requestId];

    _mintCommon(request.account, templateId);
  }

  function _mixGenes(uint256 motherGenes, uint256 fatherGenes, uint256 randomWord) internal pure returns (uint256 childGenes) {
    uint256 mask = 1;

    for (uint256 i = 0; i < 256; i++) {
      if ((randomWord & mask) == 0) {
        childGenes |= (motherGenes & mask);
      } else {
        childGenes |= (fatherGenes & mask);
      }
      mask <<= 1;
    }

    return childGenes;
  }

  function getRandomNumber() internal virtual returns (uint256 requestId);

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC721Genes).interfaceId || super.supportsInterface(interfaceId);
  }
}
