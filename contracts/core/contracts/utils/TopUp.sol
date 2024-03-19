// SPDX-License-Identifier: MIT

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {ERC1363Receiver, IERC1363Spender, IERC1363Receiver} from "@gemunion/contracts-erc1363/contracts/extensions/ERC1363Receiver.sol";

import {ExchangeUtils} from "../Exchange/lib/ExchangeUtils.sol";
import {Asset, DisabledTokenTypes} from "../Exchange/lib/interfaces/IAsset.sol";

contract TopUp is Context, ERC165, ERC1363Receiver {
  /**
   * @dev Allows to top-up the contract with tokens (NATIVE and ERC20 only).
   * @param price An array of Asset representing the tokens to be transferred.
   */
  function topUp(Asset[] memory price) external payable virtual {
    ExchangeUtils.spendFrom(price, _msgSender(), address(this), DisabledTokenTypes(false, false, true, true, true));
  }

  receive() external payable virtual {
    revert();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return
      interfaceId == type(IERC1363Receiver).interfaceId ||
      interfaceId == type(IERC1363Spender).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
