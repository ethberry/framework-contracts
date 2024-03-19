// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import {IERC4906_ID} from "@gemunion/contracts-utils/contracts/interfaces.sol";
import {METADATA_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";
import {TEMPLATE_ID} from "@gemunion/contracts-utils/contracts/attributes.sol";

import {IERC721_DISCRETE_ID} from "../utils/interfaces.sol";
import {ProtectedAttribute} from "../utils/errors.sol";
import {ERC721Blacklist} from "./ERC721Blacklist.sol";
import {IERC721Discrete} from "./interfaces/IERC721Discrete.sol";

contract ERC721BlacklistDiscrete is IERC721Discrete, ERC721Blacklist {
  event LevelUp(address account, uint256 tokenId, bytes32 attribute, uint256 value);

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Blacklist(name, symbol, royalty, baseTokenURI) {}

  /**
   * @dev Validates and upgrades attribute
   * @param tokenId The NFT to upgrade
   * @param attribute parameter name
   * @return uint256 The upgraded level
   */
  function upgrade(uint256 tokenId, bytes32 attribute) public virtual onlyRole(METADATA_ROLE) returns (uint256) {
    // TEMPLATE_ID refers to database id
    if (attribute == TEMPLATE_ID) {
      revert ProtectedAttribute(attribute);
    }

    return _upgrade(tokenId, attribute);
  }

  /**
   * @dev Does actual upgrade
   * @param tokenId The NFT to upgrade
   * @param attribute parameter name
   * @return uint256 The upgraded level
   */
  function _upgrade(uint256 tokenId, bytes32 attribute) public virtual returns (uint256) {
    _requireOwned(tokenId);
    uint256 value = _isRecordFieldKey(tokenId, attribute) ? _getRecordFieldValue(tokenId, attribute) : 0;
    _upsertRecordField(tokenId, attribute, value + 1);
    emit LevelUp(_msgSender(), tokenId, attribute, value + 1);
    emit MetadataUpdate(tokenId);
    return value + 1;
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Blacklist, IERC165) returns (bool) {
    return interfaceId == IERC4906_ID || interfaceId == IERC721_DISCRETE_ID || super.supportsInterface(interfaceId);
  }
}
