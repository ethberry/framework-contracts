// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import { GENES, TEMPLATE_ID } from "@gemunion/contracts-utils/contracts/attributes.sol";
import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { TemplateZero, MethodNotSupported } from "../utils/errors.sol";
import { GenesCryptoKitties } from "../Mechanics/Genes/GenesCK.sol";
import { Rarity } from "../Mechanics/Rarity/Rarity.sol";
import { IERC721Genes } from "./interfaces/IERC721Genes.sol";
import { ERC721Simple } from "./ERC721Simple.sol";

abstract contract ERC721Genes is IERC721Genes, ERC721Simple, GenesCryptoKitties, Rarity {
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

  function mintGenes(
    address account,
    uint256 templateId,
    uint256 genes
  ) external override onlyRole(MINTER_ROLE) {
    if (templateId == 0) {
      revert TemplateZero();
    }

    // first generation, this is not GENES this is TOKEN_ID
    _upsertRecordField(_nextTokenId, GENES, 0); // mom id
    _upsertRecordField(_nextTokenId, GENES, 0); // dad id
    _upsertRecordField(_nextTokenId, GENES, 0); // pregnancy times
    _upsertRecordField(_nextTokenId, GENES, 0); // last pregnancy timestamp

  }

  function breed(
    uint256 momId,
    uint256 dadId
  ) external onlyRole(MINTER_ROLE) {
    // child will have moms template id
    uint256 templateId = _getRecordFieldValue(momId, TEMPLATE_ID);

    uint256 momGenes = _getRecordFieldValue(momId, GENES);
    uint256 dadGenes = _getRecordFieldValue(dadId, GENES);

    _queue[getRandomNumber()] = Request(
      _msgSender(),
      templateId.toUint32(),
      momId.toUint32(), // pass mom's genes
      dadId.toUint32() // pass dad's genes
    );
  }

  function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal virtual {
    Request memory request = _queue[requestId];

    emit MintGenes(requestId, request.account, randomWords, request.templateId, _nextTokenId);

    // this token genes, needd to mix then somehow based on mom/dad genes and randomWords[0]
    _upsertRecordField(_nextTokenId, GENES, encodeData(request, randomWords[0]));
    // mom and dad token ids
    _upsertRecordField(_nextTokenId, GENES, request.matronId);
    _upsertRecordField(_nextTokenId, GENES, request.sireId);

    delete _queue[requestId];

    _mintCommon(request.account, request.templateId);
  }

  function decodeData(uint256 externalId) internal pure returns (uint256 childId, uint256 matronId, uint256 sireId) {
    // this is non needed
    childId = uint256(uint32(externalId));
    // save mom and dad to metadata using _upsertRecordField
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
    return interfaceId == type(IERC721Genes).interfaceId || super.supportsInterface(interfaceId);
  }
}
