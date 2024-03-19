// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1363Receiver} from "@gemunion/contracts-erc1363/contracts/extensions/ERC1363Receiver.sol";

import {ERC1155Holder} from "../override/ERC1155Holder.sol";

/**
 *@dev Wallet contract can receive ETH, ERC1363 tokens, ERC721 tokens, and ERC1155 tokens.
 */
contract WalletFacet is ERC721Holder, ERC1155Holder, ERC1363Receiver {}
