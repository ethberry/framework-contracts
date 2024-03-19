// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ERC721Holder, IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder, IERC1155Receiver} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import {IERC1363Receiver} from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363Receiver.sol";
import {IERC1363Spender} from "@gemunion/contracts-erc1363/contracts/interfaces/IERC1363Spender.sol";

import {Asset, Params} from "../Exchange/lib/interfaces/IAsset.sol";
import {IStaking} from "../Mechanics/Staking/interfaces/IStaking.sol";

contract ReentrancyStakingReward is ERC165, ERC721Holder, ERC1155Holder {
  bytes32 constant RECEIVE_REWARD = keccak256("RECEIVE_REWARD");
  bytes32 constant WITHDRAW = keccak256("WITHDRAW");

  bytes32 lastMethod;

  address Staking;

  // Arguments for receiveReward
  uint256 _stakeId;
  bool _withdrawDeposit;
  bool _breakLastPeriod;

  // Arguments for withdraw
  Asset _item;

  event Reentered(bool success);
  event TransferReceived(address operator, address from, uint256 value, bytes data);

  constructor(address _staking) {
    Staking = _staking;
  }

  function deposit(Params memory param, uint256[] calldata tokenIds) public payable {
    (bool success, ) = Staking.call{ value: msg.value }(
      abi.encodeWithSelector(IStaking.deposit.selector, param, tokenIds)
    );
    if (!success) {
      revert("Attacker: Deposit fail");
    }
  }

  function receiveReward(uint256 stakeId, bool withdrawDeposit, bool breakLastPeriod) public {
    // save arguments for Reentrancy
    _stakeId = stakeId;
    _withdrawDeposit = withdrawDeposit;
    _breakLastPeriod = breakLastPeriod;
    lastMethod = RECEIVE_REWARD;

    IStaking(Staking).receiveReward(stakeId, withdrawDeposit, breakLastPeriod);
  }

  function withdrawBalance(Asset memory item) public {
    lastMethod = WITHDRAW;
    _item = item;
    IStaking(Staking).withdrawBalance(item);
  }

  function onTransferReceived(
    address operator,
    address from,
    uint256 value,
    bytes memory data
  ) external returns (bytes4) {
    _reenter();

    if (data.length == 1) {
      if (data[0] == 0x00) return bytes4(0);
      if (data[0] == 0x01) revert("onTransferReceived revert");
      if (data[0] == 0x02) revert();
      if (data[0] == 0x03) assert(false);
    }
    emit TransferReceived(operator, from, value, data);
    return this.onTransferReceived.selector;
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes memory data
  ) public override returns (bytes4) {
    _reenter();
    return super.onERC721Received(operator, from, tokenId, data);
  }

  function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes memory data
  ) public virtual override returns (bytes4) {
    _reenter();
    return super.onERC1155Received(operator, from, id, value, data);
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] memory ids,
    uint256[] memory values,
    bytes memory data
  ) public virtual override returns (bytes4) {
    _reenter();
    return super.onERC1155BatchReceived(operator, from, ids, values, data);
  }

  receive() external payable {
    _reenter();
  }

  function _reenter() internal {
    bool success;
    if (lastMethod == RECEIVE_REWARD) {
      (success, ) = Staking.call(
        abi.encodeWithSelector(IStaking.receiveReward.selector, _stakeId, _withdrawDeposit, _breakLastPeriod)
      );
    } else {
      (success, ) = Staking.call(abi.encodeWithSelector(IStaking.withdrawBalance.selector, _item));
    }

    emit Reentered(success);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, ERC1155Holder) returns (bool) {
    return
      interfaceId == type(IERC1363Receiver).interfaceId ||
      interfaceId == type(IERC1363Spender).interfaceId ||
      interfaceId == type(IERC721Receiver).interfaceId ||
      interfaceId == type(IERC1155Receiver).interfaceId ||
      super.supportsInterface(interfaceId);
  }
}
