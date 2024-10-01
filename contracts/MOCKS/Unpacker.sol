// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { CoinHolder } from "@ethberry/contracts-finance/contracts/Holder.sol";

import { IERC721Wrapper } from "../Mechanics/Wrapper/interfaces/IERC721Wrapper.sol";

/**
 * @dev Unpacker is used to test unpack method of LootBox and Wrapper
 */
contract Unpacker is CoinHolder {
  function unpack(address wrapper, uint256 tokenId) public {
    IERC721Wrapper(wrapper).unpack(tokenId);
  }
}
