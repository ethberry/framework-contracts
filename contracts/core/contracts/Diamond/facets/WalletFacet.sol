// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import { ERC1363Receiver } from "@ethberry/contracts-erc1363/contracts/extensions/ERC1363Receiver.sol";

/**
 *@dev Wallet contract can receive ETH, ERC1363 tokens, ERC721 tokens, and ERC1155 tokens.
 */
contract WalletFacet is ERC721Holder, ERC1155Holder, ERC1363Receiver {}
