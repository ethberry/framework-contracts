// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.20;

import {ERC1155Simple} from "./ERC1155Simple.sol";

contract ERC1155Soulbound is ERC1155Simple {
  error Soulbound();

  constructor(uint96 royaltyNumerator, string memory baseTokenURI) ERC1155Simple(royaltyNumerator, baseTokenURI) {}

  /**
   * @dev See {IERC1155-_update}.
   */
  function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal virtual override {
    if (!(from == address(0) || to == address(0))) {
      revert Soulbound();
    }

    super._update(from, to, ids, values);
  }
}
