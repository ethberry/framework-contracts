// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

contract TraitsDnD {
  struct Traits {
    uint32 strength;
    uint32 dexterity;
    uint32 constitution;
    uint32 intelligence;
    uint32 wisdom;
    uint32 charisma;
  }

  function encodeNumbers(Traits memory traits) public pure returns (uint256 encoded) {
    encoded |= uint256(traits.strength) << 160;
    encoded |= uint256(traits.dexterity) << 128;
    encoded |= uint256(traits.constitution) << 96;
    encoded |= uint256(traits.intelligence) << 64;
    encoded |= uint256(traits.wisdom) << 32;
    encoded |= uint256(traits.charisma) << 0;
  }

  function decodeNumber(uint256 encoded) public pure returns (Traits memory traits) {
    traits = Traits(
      uint32(encoded >> 160),
      uint32(encoded >> 128),
      uint32(encoded >> 96),
      uint32(encoded >> 64),
      uint32(encoded >> 32),
      uint32(encoded >> 0)
    );
  }
}
