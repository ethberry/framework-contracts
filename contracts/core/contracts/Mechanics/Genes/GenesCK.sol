// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

contract GenesCryptoKitties {
  struct Genes {
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

  function encodeNumbers(Genes memory genes) public pure returns (uint256 encoded) {
    encoded |= uint256(genes.baseColor) << 176;
    encoded |= uint256(genes.highlightColor) << 160;
    encoded |= uint256(genes.accentColor) << 144;
    encoded |= uint256(genes.mouth) << 128;
    encoded |= uint256(genes.fur) << 112;
    encoded |= uint256(genes.pattern) << 96;
    encoded |= uint256(genes.eyeShape) << 80;
    encoded |= uint256(genes.eyeColor) << 64;
    encoded |= uint256(genes.wild) << 48;
    encoded |= uint256(genes.environment) << 32;
    encoded |= uint256(genes.secret) << 16;
    encoded |= uint256(genes.purrstige) << 0;
  }

  function decodeNumber(uint256 encoded) public pure returns (Genes memory genes) {
    genes = Genes(
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
