// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Wallet} from "@gemunion/contracts-mocks/contracts/Wallet.sol";

import {IERC721Wrapper} from "../Mechanics/Wrapper/interfaces/IERC721Wrapper.sol";

contract WrapperMock is Wallet {
  function unpack(address wrapper, uint256 tokenId) public {
    IERC721Wrapper(wrapper).unpack(tokenId);
  }
}
