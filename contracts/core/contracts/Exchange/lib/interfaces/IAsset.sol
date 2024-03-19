// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

enum TokenType {
  NATIVE, // 0: ETH on mainnet, MATIC on polygon, etc.
  ERC20, // 1: ERC20 items (ERC777 and other ERC20 analogues could also technically work)
  ERC721, // 2: ERC721 items
  ERC998, // 3: ERC998 heroes
  ERC1155 // 4: ERC1155 items
}

struct Asset {
  TokenType tokenType;
  address token;
  uint256 tokenId; // or templateId or mysteryboxId
  uint256 amount;
}

struct Params {
  uint256 externalId;
  uint256 expiresAt;
  bytes32 nonce;
  bytes32 extra;
  address receiver;
  address referrer;
}

struct DisabledTokenTypes {
  bool native;
  bool erc20;
  bool erc721;
  bool erc998;
  bool erc1155;
}
