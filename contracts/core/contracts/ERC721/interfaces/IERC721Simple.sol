// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { IERC721SimpleErrors } from "./IERC721SimpleErrors.sol";

interface IERC721Simple is IERC721SimpleErrors {
  function burn(uint256 tokenId) external;

  function mintCommon(address to, uint256 templateId) external;
}
