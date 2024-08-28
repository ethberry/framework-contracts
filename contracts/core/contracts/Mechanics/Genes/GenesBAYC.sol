// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

contract GenesBoredApesYachtClub {
  struct Genes {
    uint32 background;
    uint32 clothes;
    uint32 earring;
    uint32 eyes;
    uint32 fur;
    uint32 hat;
    uint32 mouth;
  }

  function encodeNumbers(Genes memory genes) public pure returns (uint256 encoded) {
    encoded |= uint256(genes.background) << 192;
    encoded |= uint256(genes.clothes) << 160;
    encoded |= uint256(genes.earring) << 128;
    encoded |= uint256(genes.eyes) << 96;
    encoded |= uint256(genes.fur) << 64;
    encoded |= uint256(genes.hat) << 32;
    encoded |= uint256(genes.mouth) << 0;
  }

  function decodeNumber(uint256 encoded) public pure returns (Genes memory genes) {
    genes = Genes(
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
