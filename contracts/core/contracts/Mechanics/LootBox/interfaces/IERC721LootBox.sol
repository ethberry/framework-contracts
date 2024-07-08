// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";

struct LootBoxConfig {
  uint128 min;
  uint128 max;
}

interface IERC721LootBox {
  function mintBox(address to, uint256 templateId, Asset[] memory items, LootBoxConfig calldata boxConfig) external;
}
