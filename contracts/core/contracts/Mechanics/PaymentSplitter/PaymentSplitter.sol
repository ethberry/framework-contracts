// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import { ERC1363Receiver, IERC1363Receiver, IERC1363Spender } from "@gemunion/contracts-erc1363/contracts/extensions/ERC1363Receiver.sol";
import { PaymentSplitter as Splitter } from "@gemunion/contracts-utils/contracts/PaymentSplitter.sol";

contract GemunionSplitter is Splitter, ERC165, ERC1363Receiver {
  constructor(address[] memory payees, uint256[] memory shares) Splitter (payees, shares) { }

  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return
      interfaceId == type(IERC1363Receiver).interfaceId ||
      interfaceId == type(IERC1363Spender).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
