// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC1155 } from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import { IERC1363 } from "@ethberry/contracts-erc1363/contracts/interfaces/IERC1363.sol";
import { IERC1363_ID, IERC1363_RECEIVER_ID } from "@ethberry/contracts-utils/contracts/interfaces.sol";

import { IERC20Burnable } from "../../ERC20/interfaces/IERC20Burnable.sol";
import { IERC721Simple } from "../../ERC721/interfaces/IERC721Simple.sol";
import { IERC1155Simple } from "../../ERC1155/interfaces/IERC1155Simple.sol";
import { Asset, AllowedTokenTypes, TokenType } from "./interfaces/IAsset.sol";

library ExchangeUtils {
  using Address for address;
  using SafeERC20 for IERC20;

  event PaymentReceived(address from, uint256 amount);
  event PaymentReleased(address to, uint256 amount);

  error UnsupportedTokenType(); // used to indicate that certain token types are not allowed for mechanics
  error ETHInvalidReceiver(address receiver); // contract does not implement `receive` method
  error ETHInsufficientBalance(address sender, uint256 balance, uint256 needed); // transaction has not enough ETH

  /**
   * @dev Transfer all types of tokens from `spender` to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param spender Address of spender
   * @param receiver Address of receiver
   * @param allowed Disabled TokenTypes for spend from spender
   */
  function spendFrom(
    Asset[] memory price,
    address spender,
    address receiver,
    AllowedTokenTypes memory allowed
  ) internal {
    // The total amount of native tokens in the transaction.
    uint256 totalAmount;

    // Loop through all assets
    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` token is native.
      if (item.tokenType == TokenType.NATIVE && allowed.native) {
        // increase the total amount.
        totalAmount = totalAmount + item.amount;
      }
      // If the `Asset` token is an ERC20 token.
      else if (item.tokenType == TokenType.ERC20 && allowed.erc20) {
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
        (item.tokenType == TokenType.ERC721 && allowed.erc721) || (item.tokenType == TokenType.ERC998 && allowed.erc998)
      ) {
        // Transfer the ERC721/ERC998 token in a safe way
        IERC721(item.token).safeTransferFrom(spender, receiver, item.tokenId);
      }
      // If the `Asset` token is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && allowed.erc1155) {
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
        revert ETHInsufficientBalance(spender, msg.value, totalAmount);
      } else if (address(this) == receiver) {
        emit PaymentReceived(receiver, msg.value);
      } else if (receiver == address(0)) {
        revert ETHInvalidReceiver(address(0));
      } else {
        Address.sendValue(payable(receiver), totalAmount);
        emit PaymentReleased(receiver, totalAmount);
      }
    }
  }

  /**
   * @dev Burn all types of tokens.
   * @dev burn ERC721, ERC998, ERC1155 or transfer NATIVE, ERC20 to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param spender Address of spender
   * @param allowed Disabled TokenTypes for spend from spender
   */
  function burnFrom(Asset[] memory price, address spender, AllowedTokenTypes memory allowed) internal {
    // The total amount of native tokens in the transaction.

    // Loop through all assets
    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` token is native.
      if (item.tokenType == TokenType.ERC20 && allowed.erc20) {
        IERC20Burnable(item.token).burnFrom(spender, item.amount);
      }
      // If the `Asset` token is an ERC721/ERC998 token.
      else if (
        (item.tokenType == TokenType.ERC721 && allowed.erc721) || (item.tokenType == TokenType.ERC998 && allowed.erc998)
      ) {
        // BURN the ERC721/ERC998 token
        IERC721Simple(item.token).burn(item.tokenId);
      }
      // If the `Asset` token is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && allowed.erc1155) {
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
   * @dev Transfer all types of tokens from `this contract` to `receiver`.
   *
   * @param price An array of assets to transfer
   * @param receiver Address of receiver
   * @param allowed Disabled TokenTypes for spend from spender
   */
  function spend(Asset[] memory price, address receiver, AllowedTokenTypes memory allowed) internal {
    // The total amount of native tokens in the transaction.
    uint256 totalAmount;
    // Loop through all assets
    uint256 length = price.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];
      // If the `Asset` is native token.
      if (item.tokenType == TokenType.NATIVE && allowed.native) {
        // increase the total amount.
        totalAmount = totalAmount + item.amount;
      }
      // If the `Asset` is an ERC20 token.
      else if (item.tokenType == TokenType.ERC20 && allowed.erc20) {
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
        (item.tokenType == TokenType.ERC721 && allowed.erc721) || (item.tokenType == TokenType.ERC998 && allowed.erc998)
      ) {
        // Transfer the ERC721/ERC998 token in a safe way
        IERC721(item.token).safeTransferFrom(address(this), receiver, item.tokenId);
      }
      // If the `Asset` is an ERC1155 token.
      else if (item.tokenType == TokenType.ERC1155 && allowed.erc1155) {
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
      if (receiver == address(0)) {
        revert ETHInvalidReceiver(address(0));
      } else {
        Address.sendValue(payable(receiver), totalAmount);
        emit PaymentReleased(receiver, totalAmount);
      }
    }
  }

  /**
   * @dev Transfer currency tokens from `this contract` to `receiver` and mints new NFTs to `receiver`.
   *
   * @param items An array of assets to mint.
   * @param receiver Address of receiver
   * @param allowed Disabled TokenTypes for spend from spender
   */
  function acquire(Asset[] memory items, address receiver, AllowedTokenTypes memory allowed) internal {
    uint256 length = items.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = items[i];

      // If the token is an NATIVE token, transfer tokens to the receiver.
      if (item.tokenType == TokenType.NATIVE && allowed.native) {
        spend(_toArray(item), receiver, allowed);
        // If the `Asset` is an ERC20 token.
      } else if (item.tokenType == TokenType.ERC20 && allowed.erc20) {
        spend(_toArray(item), receiver, allowed);
      } else if (
        (item.tokenType == TokenType.ERC721 && allowed.erc721) || (item.tokenType == TokenType.ERC998 && allowed.erc998)
      ) {
        for (uint256 loopIndex = 0; loopIndex < item.amount;) {
          IERC721Simple(item.token).mintCommon(receiver, item.tokenId);
          unchecked {
            loopIndex++;
          }
        }
      } else if (item.tokenType == TokenType.ERC1155 && allowed.erc1155) {
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
   * @dev Transfer currency tokens from `spender` to `receiver` and mints new NFTs to `receiver`.
   *
   * @param items An array of assets to mint.
   * @param receiver Address of receiver
   * @param allowed Disabled TokenTypes for spend from spender
   */
  function acquireFrom(
    Asset[] memory items,
    address spender,
    address receiver,
    AllowedTokenTypes memory allowed
  ) internal {
    uint256 length = items.length;

    for (uint256 i = 0; i < length; ) {
      Asset memory item = items[i];

      if (item.tokenType == TokenType.ERC20 && allowed.erc20) {
        spendFrom(_toArray(item), spender, receiver, allowed);
      } else if (
        (item.tokenType == TokenType.ERC721 && allowed.erc721) || (item.tokenType == TokenType.ERC998 && allowed.erc998)
      ) {
        for (uint256 loopIndex = 0; loopIndex < item.amount; ) {
          IERC721Simple(item.token).mintCommon(receiver, item.tokenId);
          unchecked {
            loopIndex++;
          }
        }
      } else if (item.tokenType == TokenType.ERC1155 && allowed.erc1155) {
        IERC1155Simple(item.token).mint(receiver, item.tokenId, item.amount, "0x");
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
   * @dev Utility function that converts single item into array of items
   *
   * @param item a single Asset to be converted to array
   */
  function _toArray(Asset memory item) internal pure returns (Asset[] memory) {
    Asset[] memory items = new Asset[](1);
    items[0] = item;
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
