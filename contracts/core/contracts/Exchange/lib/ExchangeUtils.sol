// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { IERC1363 } from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363.sol";
import { IERC1363_ID, IERC1363_RECEIVER_ID } from "@gemunion/contracts-utils/contracts/interfaces.sol";

import { IERC20Burnable } from "../../ERC20/interfaces/IERC20Burnable.sol";
import { IERC721Simple } from "../../ERC721/interfaces/IERC721Simple.sol";
import { IERC721Random } from "../../ERC721/interfaces/IERC721Random.sol";
import { IERC1155Simple } from "../../ERC1155/interfaces/IERC1155Simple.sol";
import { IERC721_RANDOM_ID } from "../../utils/interfaces.sol";
import { UnsupportedTokenType, WrongAmount } from "../../utils/errors.sol";
import { Asset, DisabledTokenTypes, TokenType } from "./interfaces/IAsset.sol";

library ExchangeUtils {
  using Address for address;
  using SafeERC20 for IERC20;

  event PaymentEthReceived(address from, uint256 amount);
  event PaymentEthSent(address to, uint256 amount);

  /**
   * @dev transfer `Assets` from `spender` to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param spender Address of spender
   * @param receiver Address of receiver
   * @param disabled Disabled TokenTypes for spend from spender
   */
  function spendFrom(
    Asset[] memory price,
    address spender,
    address receiver,
    DisabledTokenTypes memory disabled
  ) internal {
    // The total amount of native tokens in the transaction.
    uint256 totalAmount;

    // Loop through all assets
    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` token is native.
      if (item.tokenType == TokenType.NATIVE && !disabled.native) {
        // increase the total amount.
        totalAmount = totalAmount + item.amount;
      }
      // If the `Asset` token is an ERC20 token.
      else if (item.tokenType == TokenType.ERC20 && !disabled.erc20) {
        if (_isERC1363Supported(receiver, item.token)) {
          // Transfer the ERC20 token and emit event to notify server
          IERC1363(item.token).transferFromAndCall(spender, receiver, item.amount);
        } else {
          // Transfer the ERC20 token in a safe way
          SafeERC20.safeTransferFrom(IERC20(item.token), spender, receiver, item.amount);
        }
      }
      // If the `Asset` token is an ERC721/ERC998 token.
      else if (
        (item.tokenType == TokenType.ERC721 && !disabled.erc721) ||
        (item.tokenType == TokenType.ERC998 && !disabled.erc998)
      ) {
        // Transfer the ERC721/ERC998 token in a safe way
        IERC721(item.token).safeTransferFrom(spender, receiver, item.tokenId);
      }
      // If the `Asset` token is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && !disabled.erc1155) {
        // Transfer the ERC1155 token in a safe way
        IERC1155(item.token).safeTransferFrom(spender, receiver, item.tokenId, item.amount, "0x");
      } else {
        // should never happen
        revert UnsupportedTokenType();
      }

      unchecked {
        i++;
      }
    }

    // If there is any native token in the transaction.
    if (totalAmount > 0) {
      // Verify the total amount of native tokens matches the amount sent with the transaction.
      // This basically protects against reentrancy attack.
      if (totalAmount > msg.value) {
        revert WrongAmount();
      }
      if (address(this) == receiver) {
        emit PaymentEthReceived(receiver, msg.value);
      } else {
        Address.sendValue(payable(receiver), totalAmount);
        emit PaymentEthSent(receiver, totalAmount);
      }
    }
  }

  /**
   * @dev burn or transfer `Assets`.
   * @dev burn ERC721, ERC998, ERC1155 or transfer NATIVE, ERC20 to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param spender Address of spender
   * @param disabled Disabled TokenTypes for spend from spender
   */
  function burnFrom(
    Asset[] memory price,
    address spender,
    DisabledTokenTypes memory disabled
  ) internal {
    // The total amount of native tokens in the transaction.

    // Loop through all assets
    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` token is native.
      if (item.tokenType == TokenType.ERC20 && !disabled.erc20) {
        IERC20Burnable(item.token).burnFrom(spender, item.amount);
      }
      // If the `Asset` token is an ERC721/ERC998 token.
      else if (
        (item.tokenType == TokenType.ERC721 && !disabled.erc721) ||
        (item.tokenType == TokenType.ERC998 && !disabled.erc998)
      ) {
        // BURN the ERC721/ERC998 token
        IERC721Simple(item.token).burn(item.tokenId);
      }
      // If the `Asset` token is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && !disabled.erc1155) {
        // BURN the ERC1155 token
        IERC1155Simple(item.token).burn(spender, item.tokenId, item.amount);
      } else {
        // NATIVE
        revert UnsupportedTokenType();
      }

    unchecked {
      i++;
    }
    }
  }

  /**
   * @dev transfer `Assets` from `this contract` to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param receiver Address of receiver
   */
  function spend(Asset[] memory price, address receiver, DisabledTokenTypes memory disabled) internal {
    // The total amount of native tokens in the transaction.
    uint256 totalAmount;
    // Loop through all assets
    uint256 length = price.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` is native token.
      if (item.tokenType == TokenType.NATIVE && !disabled.native) {
        // increase the total amount.
        totalAmount = totalAmount + item.amount;
      }
      // If the `Asset` is an ERC20 token.
      else if (item.tokenType == TokenType.ERC20 && !disabled.erc20) {
        if (_isERC1363Supported(receiver, item.token)) {
          // Transfer the ERC20 token and emit event to notify server
          IERC1363(item.token).transferAndCall(receiver, item.amount);
        } else {
          // Transfer the ERC20 token in a safe way
          SafeERC20.safeTransfer(IERC20(item.token), receiver, item.amount);
        }
      }
      // If the `Asset` is an ERC721/ERC998 token.
      else if (
        (item.tokenType == TokenType.ERC721 && !disabled.erc721) ||
        (item.tokenType == TokenType.ERC998 && !disabled.erc998)
      ) {
        // Transfer the ERC721/ERC998 token in a safe way
        IERC721(item.token).safeTransferFrom(address(this), receiver, item.tokenId);
      }
      // If the `Asset` is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && !disabled.erc1155) {
        // Transfer the ERC1155 token in a safe way
        IERC1155(item.token).safeTransferFrom(address(this), receiver, item.tokenId, item.amount, "0x");
      } else {
        // should never happen
        revert UnsupportedTokenType();
      }

      unchecked {
        i++;
      }
    }

    // If there is any native token in the transaction.
    if (totalAmount > 0) {
      // Send the total amount to the receiver
      Address.sendValue(payable(receiver), totalAmount);
      emit PaymentEthSent(receiver, totalAmount);
    }
  }

  /**
   * @dev Mints array of `Assets` to `receiver`.
   *
   * @param items An array of assets to mint.
   * @param receiver Address of receiver
   */
  function acquire(Asset[] memory items, address receiver, DisabledTokenTypes memory disabled) internal {
    uint256 length = items.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = items[i];

      // If the token is an NATIVE token, transfer tokens to the receiver.
      if (item.tokenType == TokenType.NATIVE && !disabled.native) {
        spend(_toArray(item), receiver, disabled);
        // If the `Asset` is an ERC20 token.
      } else if (item.tokenType == TokenType.ERC20 && !disabled.erc20) {
        spend(_toArray(item), receiver, disabled);
      } else if (
        (item.tokenType == TokenType.ERC721 && !disabled.erc721) ||
        (item.tokenType == TokenType.ERC998 && !disabled.erc998)
      ) {
        bool randomInterface = IERC721(item.token).supportsInterface(IERC721_RANDOM_ID);
        if (randomInterface) {
          IERC721Random(item.token).mintRandom(receiver, item.tokenId);
        } else {
          IERC721Simple(item.token).mintCommon(receiver, item.tokenId);
        }
      } else if (item.tokenType == TokenType.ERC1155 && !disabled.erc1155) {
        IERC1155Simple(item.token).mint(receiver, item.tokenId, item.amount, "0x");
      } else {
        // should never happen
        revert UnsupportedTokenType();
      }

      unchecked {
        i++;
      }
    }
  }

  /**
   * @dev Mints array of `Assets` from 'spender' to `receiver`.
   *
   * @param items An array of assets to mint.
   * @param receiver Address of receiver
   */
  function acquireFrom(Asset[] memory items, address spender, address receiver, DisabledTokenTypes memory disabled) internal {
    uint256 length = items.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = items[i];

      // If the token is an NATIVE token, transfer tokens to the receiver.
      if (item.tokenType == TokenType.NATIVE && !disabled.native) {
        spendFrom(_toArray(item), spender, receiver, disabled);
        // If the `Asset` is an ERC20 token.
      } else if (item.tokenType == TokenType.ERC20 && !disabled.erc20) {
        spendFrom(_toArray(item), spender, receiver, disabled);
      } else if (
        (item.tokenType == TokenType.ERC721 && !disabled.erc721) ||
        (item.tokenType == TokenType.ERC998 && !disabled.erc998)
      ) {
        bool randomInterface = IERC721(item.token).supportsInterface(IERC721_RANDOM_ID);
        if (randomInterface) {
          for (uint256 loopIndex = 0; loopIndex < item.amount;) {
            IERC721Random(item.token).mintRandom(receiver, item.tokenId);
            unchecked {
              loopIndex++;
            }
          }
        } else {
          for (uint256 loopIndex = 0; loopIndex < item.amount;) {
            IERC721Simple(item.token).mintCommon(receiver, item.tokenId);
            unchecked {
              loopIndex++;
            }
          }
        }
      } else if (item.tokenType == TokenType.ERC1155 && !disabled.erc1155) {
        IERC1155Simple(item.token).mint(receiver, item.tokenId, item.amount, "0x");
      } else {
        // should never happen
        revert UnsupportedTokenType();
      }

    unchecked {
      i++;
    }
    }
  }

  /**
   * @dev Utility function that converts single item into array of items
   *
   * @param item a single Asset to be converted to array
   */
  function _toArray(Asset memory item) internal pure returns (Asset[] memory) {
    Asset[] memory items = new Asset[](1);
    items[0] = item;
    return items;
  }

  /**
   * @dev Utility function that concatenate item and price into array of items
   *
   * @param item a single Asset to be converted to array
   * @param price a single Asset to be converted to array
   */
  function _toArrayConcat(Asset memory item, Asset memory price) internal pure returns (Asset[] memory) {
    Asset[] memory items = new Asset[](2);
    items[0] = item;
    items[1] = price;
    return items;
  }

  function _isERC1363Supported(address receiver, address token) internal view returns (bool) {
    return
      (receiver == address(this) ||
        (receiver.code.length != 0 && _tryGetSupportedInterface(receiver, IERC1363_RECEIVER_ID))) &&
      _tryGetSupportedInterface(token, IERC1363_ID);
  }

  function _tryGetSupportedInterface(address account, bytes4 interfaceId) internal view returns (bool) {
    try IERC165(account).supportsInterface(interfaceId) returns (bool isSupported) {
      return isSupported;
    } catch (bytes memory) {
      return false;
    }
  }
}
