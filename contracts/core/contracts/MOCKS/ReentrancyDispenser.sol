// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ERC1155Holder, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {ERC721Holder, IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import {IDispenser} from "../Mechanics/Dispenser/interfaces/IDispenser.sol";
import {Asset, TokenType} from "../Exchange/lib/interfaces/IAsset.sol";

contract ReentrancyDispenser is ERC165, ERC721Holder, ERC1155Holder {
  IDispenser dispenser;
  address token;

  constructor(IDispenser _dispenser, address _token) {
    dispenser = _dispenser;
    token = _token;
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes memory data
  ) public override returns (bytes4) {
    Asset[] memory items = new Asset[](1);
    items[0] = Asset(TokenType.ERC721, token, 2, 1);
    address[] memory receivers = new address[](1);
    receivers[0] = address(this);
    (bool success, ) = address(dispenser).call(abi.encodeWithSelector(dispenser.disperse.selector, items, receivers));
    success;
    return super.onERC721Received(operator, from, tokenId, data);
  }

  function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes memory data
  ) public virtual override returns (bytes4) {
    Asset[] memory items = new Asset[](1);
    items[0] = Asset(TokenType.ERC1155, token, 1, 100000);
    address[] memory receivers = new address[](1);
    receivers[0] = address(this);
    (bool success, ) = address(dispenser).call(abi.encodeWithSelector(dispenser.disperse.selector, items, receivers));
    success;
    return super.onERC1155Received(operator, from, id, value, data);
  }

  receive() external payable {
    uint256 balance = address(msg.sender).balance;
    if (balance > 0) {
      Asset[] memory items = new Asset[](1);
      items[0] = Asset(TokenType.NATIVE, address(0), 0, balance);
      address[] memory receivers = new address[](1);
      receivers[0] = address(this);
      (bool success, ) = address(dispenser).call(abi.encodeWithSelector(dispenser.disperse.selector, items, receivers));
      success;
    }
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, ERC1155Holder) returns (bool) {
    return
      interfaceId == type(IERC721Receiver).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
