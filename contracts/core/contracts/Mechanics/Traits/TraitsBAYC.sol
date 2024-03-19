// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

// Bored Ape Yacht Club
contract TraitsBAYC {
  struct Traits {
    uint32 background;
    uint32 clothes;
    uint32 earring;
    uint32 eyes;
    uint32 fur;
    uint32 hat;
    uint32 mouth;
  }

  function encodeNumbers(Traits memory traits) public pure returns (uint256 encoded) {
    encoded |= uint256(traits.background) << 192;
    encoded |= uint256(traits.clothes) << 160;
    encoded |= uint256(traits.earring) << 128;
    encoded |= uint256(traits.eyes) << 96;
    encoded |= uint256(traits.fur) << 64;
    encoded |= uint256(traits.hat) << 32;
    encoded |= uint256(traits.mouth) << 0;
  }

  function decodeNumber(uint256 encoded) public pure returns (Traits memory traits) {
    traits = Traits(
      uint32(encoded >> 192),
      uint32(encoded >> 160),
      uint32(encoded >> 128),
      uint32(encoded >> 96),
      uint32(encoded >> 64),
      uint32(encoded >> 32),
      uint32(encoded >> 0)
    );
  }
}
