// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AllTypesHolder } from "@gemunion/contracts-finance/contracts/Holder.sol";

import { IERC721Wrapper } from "../Mechanics/Wrapper/interfaces/IERC721Wrapper.sol";

contract WrapperMock is AllTypesHolder {
  function unpack(address wrapper, uint256 tokenId) public {
    IERC721Wrapper(wrapper).unpack(tokenId);
  }
}
