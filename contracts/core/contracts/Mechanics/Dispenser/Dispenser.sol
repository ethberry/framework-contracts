// SPDX-License-Identifier: UNLICENSED

/**
 *Submitted for verification at BscScan.com on 2020-09-14
 */

pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {ExchangeUtils} from "../../Exchange/lib/ExchangeUtils.sol";
import {IDispenser} from "./interfaces/IDispenser.sol";
import {Asset, DisabledTokenTypes} from "../../Exchange/lib/interfaces/IAsset.sol";
import {WrongArrayLength} from "../../utils/errors.sol";

/**
 * @title Dispenser Contract
 * @dev A contract for dispersing ether, ERC20 tokens, ERC721 tokens, and ERC1155 tokens to multiple recipients.
 */
contract Dispenser is IDispenser, ERC165, Context {
  function disperse(Asset[] memory items, address[] calldata receivers) external payable override {
    if (items.length != receivers.length) {
      revert WrongArrayLength();
    }

    uint256 length = receivers.length;
    for (uint256 i = 0; i < length; ) {
      ExchangeUtils.spendFrom(
        ExchangeUtils._toArray(items[i]),
        _msgSender(),
        receivers[i],
        DisabledTokenTypes(false, false, false, false, false)
      );
      unchecked {
        i++;
      }
    }
  }

  receive() external payable {
    revert();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IDispenser).interfaceId || super.supportsInterface(interfaceId);
  }
}
