// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IERC1155Simple is IERC1155 {
  function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external;

  function mint(address to, uint256 id, uint256 amount, bytes memory data) external;

  function burn(address from, uint256 id, uint256 amount) external;

  function burnBatch(address from, uint256[] memory ids, uint256[] memory amounts) external;
}
