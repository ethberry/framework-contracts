// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { METADATA_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { IERC4906_ID } from "@ethberry/contracts-utils/contracts/interfaces.sol";
import { TEMPLATE_ID } from "@ethberry/contracts-utils/contracts/attributes.sol";

import { ERC998Simple } from "../../ERC998/ERC998Simple.sol";
import { ERC721Simple } from "../../ERC721/ERC721Simple.sol";
import { IERC721Discrete } from "./interfaces/IERC721Discrete.sol";

contract ERC998Discrete is IERC721Discrete, ERC998Simple {
  event LevelUp(address account, uint256 tokenId, bytes32 attribute, uint256 value);

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC998Simple(name, symbol, royalty, baseTokenURI) {}

  /**
   * @dev Validates and upgrades attribute
   * @param tokenId The NFT to upgrade
   * @param attribute parameter name
   * @return uint256 The upgraded level
   */
  function upgrade(
    uint256 tokenId,
    bytes32 attribute
  ) public virtual override onlyRole(METADATA_ROLE) returns (uint256) {
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
   * @return The result of operation
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
  function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC998Simple) returns (bool) {
    return
      interfaceId == IERC4906_ID ||
      interfaceId == type(IERC721Discrete).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
