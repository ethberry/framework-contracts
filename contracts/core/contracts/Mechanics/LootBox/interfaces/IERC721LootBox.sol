// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721BoxErrors } from "../../../ERC721/interfaces/IERC721BoxErrors.sol";

interface IERC721LootBox is IERC721BoxErrors {
  struct LootBoxConfig {
    uint128 min;
    uint128 max;
  }

  function mintBox(address to, uint256 templateId, Asset[] memory content, LootBoxConfig calldata boxConfig) external;
}
