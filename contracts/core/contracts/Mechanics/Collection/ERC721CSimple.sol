// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.13;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { ERC721 } from  "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

import { ERC721ABaseUrl } from "@gemunion/contracts-erc721/contracts/extensions/ERC721ABaseUrl.sol";
import { ERC721ABRK } from "@gemunion/contracts-erc721c/contracts/preset/ERC721ABRK.sol";
import { NativeRejector } from "@gemunion/contracts-finance/contracts/Holder.sol";
import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignerMissingRole, MethodNotSupported } from "../../utils/errors.sol";

contract ERC721CSimple is ERC721ABRK, ERC721ABaseUrl, NativeRejector {
  uint96 _batchSize;

  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI,
    uint96 batchSize,
    address owner
  ) ERC721ABRK(name, symbol, royalty) ERC721ABaseUrl(baseTokenURI) {
    _batchSize = batchSize;
    _mintConsecutive2(owner, batchSize);
  }

  // Default limit of 5k comes from this discussion
  // https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2355#issuecomment-1200144796
  // to have more than 5k you might want to override _mintConsecutive and emit more than one event
  function _maxBatchSize() internal view override returns (uint96) {
    return _batchSize;
  }

  function _mintConsecutive2(address owner, uint96 batchSize) internal override returns (uint96) {
    return super._mintConsecutive(owner, batchSize);
  }

  function mintConsecutive(address to, uint256 tokenId) external virtual onlyRole(MINTER_ROLE) {
    _safeMint(to, tokenId);
  }

  function mint(address, uint256) public pure override {
    revert MethodNotSupported();
  }

  function safeMint(address, uint256) public pure override {
    revert MethodNotSupported();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721ABRK) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  function _baseURI() internal view virtual override(ERC721, ERC721ABaseUrl) returns (string memory) {
    return _baseURI(_baseTokenURI);
  }
}
