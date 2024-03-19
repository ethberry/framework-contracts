// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {BlackList} from "@gemunion/contracts-access/contracts/extension/BlackList.sol";
import {ERC1155ABSR} from "@gemunion/contracts-erc1155/contracts/preset/ERC1155ABSR.sol";

import {ERC1155Simple} from "./ERC1155Simple.sol";

contract ERC1155Blacklist is ERC1155Simple, BlackList {
  constructor(uint96 royaltyNumerator, string memory baseTokenURI) ERC1155Simple(royaltyNumerator, baseTokenURI) {}

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC1155ABSR, BlackList) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {IERC1155-_update}.
   */
  function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override {
    if (from != address(0) && _isBlacklisted(from)) {
      revert BlackListError(from);
    }

    if (to != address(0) && _isBlacklisted(to)) {
      revert BlackListError(to);
    }

    super._update(from, to, ids, values);
  }
}
