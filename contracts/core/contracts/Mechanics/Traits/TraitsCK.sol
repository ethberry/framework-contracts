// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

// CryptoKitties
contract TraitsCK {
  struct Traits {
    uint16 baseColor;
    uint16 highlightColor;
    uint16 accentColor;
    uint16 mouth;
    uint16 fur;
    uint16 pattern;
    uint16 eyeShape;
    uint16 eyeColor;
    uint16 wild;
    uint16 environment;
    uint16 secret;
    uint16 purrstige;
  }

  function encodeNumbers(Traits memory traits) public pure returns (uint256 encoded) {
    encoded |= uint256(traits.baseColor) << 176;
    encoded |= uint256(traits.highlightColor) << 160;
    encoded |= uint256(traits.accentColor) << 144;
    encoded |= uint256(traits.mouth) << 128;
    encoded |= uint256(traits.fur) << 112;
    encoded |= uint256(traits.pattern) << 96;
    encoded |= uint256(traits.eyeShape) << 80;
    encoded |= uint256(traits.eyeColor) << 64;
    encoded |= uint256(traits.wild) << 48;
    encoded |= uint256(traits.environment) << 32;
    encoded |= uint256(traits.secret) << 16;
    encoded |= uint256(traits.purrstige) << 0;
  }

  function decodeNumber(uint256 encoded) public pure returns (Traits memory traits) {
    traits = Traits(
      uint16(encoded >> 176),
      uint16(encoded >> 160),
      uint16(encoded >> 144),
      uint16(encoded >> 128),
      uint16(encoded >> 112),
      uint16(encoded >> 96),
      uint16(encoded >> 80),
      uint16(encoded >> 64),
      uint16(encoded >> 48),
      uint16(encoded >> 32),
      uint16(encoded >> 16),
      uint16(encoded >> 0)
    );
  }
}
