// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import {IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import {IERC1363Receiver} from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363Receiver.sol";
import {IERC1363Spender} from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363Spender.sol";

import {LibDiamond} from "../../lib/LibDiamond.sol";

contract WalletInit {
    function init() public virtual {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC1363Receiver).interfaceId] = true;
        ds.supportedInterfaces[type(IERC1363Spender).interfaceId] = true;
        ds.supportedInterfaces[type(IERC721Receiver).interfaceId] = true;
        ds.supportedInterfaces[type(IERC1155Receiver).interfaceId] = true;
    }
}
