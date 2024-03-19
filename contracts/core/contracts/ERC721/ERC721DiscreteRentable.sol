// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC721} from  "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

import {METADATA_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";
import {ERC4907} from "@gemunion/contracts-erc721/contracts/extensions/ERC4907.sol";
import {ERC721ABER} from "@gemunion/contracts-erc721e/contracts/preset/ERC721ABER.sol";

// import {constants} from "../utils/constants.sol";
import {ERC721Simple} from "./ERC721Simple.sol";
import {ERC721Discrete} from "./ERC721Discrete.sol";

contract ERC721DiscreteRentable is ERC721Discrete, ERC4907 {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Discrete(name, symbol, royalty, baseTokenURI) {}

  function setUser(uint256 tokenId, address user, uint64 expires) public override onlyRole(METADATA_ROLE) {
    super.setUser(tokenId, user, expires);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721Discrete, ERC4907) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev See {ERC721-_update}.
   */
  function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721ABER, ERC4907) returns (address) {
    return super._update(to, tokenId, auth);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override(ERC721, ERC721ABER) {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override(ERC721, ERC721Simple) returns (string memory) {
    return super._baseURI();
  }
}
