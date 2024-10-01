// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { VRFConsumerBaseV2Plus } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";

import { ChainLinkGemunionV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkGemunionV2Plus.sol";
import { ChainLinkBaseV2Plus } from "@ethberry/contracts-chain-link-v2-plus/contracts/extensions/ChainLinkBaseV2Plus.sol";

import { ERC998BlacklistDiscreteRandom } from "../ERC998BlacklistDiscreteRandom.sol";

contract ERC998BlacklistDiscreteRandomGemunion is ERC998BlacklistDiscreteRandom, ChainLinkGemunionV2Plus {
  constructor(
    string memory name,
    string memory symbol,
    uint96 royalty,
    string memory baseTokenURI
  )
    ERC998BlacklistDiscreteRandom(name, symbol, royalty, baseTokenURI)
    ChainLinkGemunionV2Plus(uint16(6), uint32(600000), uint32(1))
  {}
  function getRandomNumber()
    internal
    override(ChainLinkBaseV2Plus, ERC998BlacklistDiscreteRandom)
    returns (uint256 requestId)
  {
    return super.getRandomNumber();
  }

  function fulfillRandomWords(
    uint256 requestId,
    uint256[] calldata randomWords
  ) internal override(ERC998BlacklistDiscreteRandom, VRFConsumerBaseV2Plus) {
    return super.fulfillRandomWords(requestId, randomWords);
  }

  /**
   * @dev See {ERC721-_increaseBalance}.
   */
  function _increaseBalance(address account, uint128 amount) internal virtual override {
    super._increaseBalance(account, amount);
  }

  /**
   * @dev See {ERC721-_baseURI}.
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return super._baseURI();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, ERC998BlacklistDiscreteRandom) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
