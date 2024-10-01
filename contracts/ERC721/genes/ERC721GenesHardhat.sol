// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

import { ChainLinkBaseV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkBaseV2Plus.sol";
import { ChainLinkHardhatV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkHardhatV2Plus.sol";

import { ERC721Genes } from "../ERC721Genes.sol";

contract ERC721GenesHardhat is ERC721Genes, ChainLinkHardhatV2Plus {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  ) ERC721Genes(name, symbol, royalty, baseTokenURI) ChainLinkHardhatV2Plus(uint16(6), uint32(600000), uint32(1)) {}

  function getRandomNumber() internal override(ChainLinkBaseV2Plus, ERC721Genes) returns (uint256 requestId) {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override(ERC721Genes, VRFConsumerBaseV2Plus) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC721Genes) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
