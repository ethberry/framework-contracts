// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Asset } from "../../../Exchange/lib/interfaces/IAsset.sol";
import { IERC721BoxErrors } from "../../../ERC721/interfaces/IERC721BoxErrors.sol";
import { ITokenValidationErrors } from "../../../Exchange/interfaces/ITokenValidationErrors.sol";

interface IERC721MysteryBox is IERC721BoxErrors, ITokenValidationErrors {
  function mintBox(address to, uint256 templateId, Asset[] memory content) external;
}
