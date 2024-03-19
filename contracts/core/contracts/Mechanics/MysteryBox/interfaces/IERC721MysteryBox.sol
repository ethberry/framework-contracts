// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Asset} from "../../../Exchange/lib/interfaces/IAsset.sol";

interface IERC721MysteryBox {
  function mintBox(address to, uint256 templateId, Asset[] memory items) external;
}
