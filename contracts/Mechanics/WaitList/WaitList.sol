// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { MerkleProof } from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { PAUSER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { NativeRejector, CoinHolder } from "@ethberry/contracts-finance/contracts/Holder.sol";

import { TopUp } from "../../utils/TopUp.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, Params, TokenType, AllowedTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";
import { IWaitList } from "./interfaces/IWaitList.sol";

contract WaitList is IWaitList, AccessControl, Pausable, NativeRejector, CoinHolder, TopUp {
  mapping(uint256 => bytes32) internal _roots;
  mapping(uint256 => mapping(address => bool)) internal _claimed;
  mapping(uint256 => Asset[]) internal _items;

  event WaitListRewardSet(uint256 externalId, bytes32 root, Asset[] items);
  event WaitListRewardClaimed(address account, uint256 externalId, Asset[] items);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  function setReward(Params memory params, Asset[] memory items) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (_roots[params.externalId] != "") {
      revert WaitListRootAlreadySet();
    }

    _roots[params.externalId] = params.extra;

    if (items.length == 0) {
      revert WaitListNoReward();
    }

    uint256 length = items.length;
    for (uint256 i = 0; i < length; ) {
      _items[params.externalId].push(items[i]);
      unchecked {
        i++;
      }
    }

    emit WaitListRewardSet(params.externalId, params.extra, items);
  }

  function claim(bytes32[] calldata proof, uint256 externalId) public whenNotPaused {
    if (_roots[externalId] == "") {
      revert WaitListMissingRoot();
    }

    // OpenZeppelin double hash leaf, see
    // https://github.com/OpenZeppelin/merkle-tree/blob/master/src/hashes.ts#L9
    bytes32 leaf = keccak256(abi.encode(keccak256(abi.encode(_msgSender()))));
    bool verified = MerkleProof.verifyCalldata(proof, _roots[externalId], leaf);

    if (!verified) {
      revert WaitListAddressAlreadyExists(_msgSender());
    }

    if (_claimed[externalId][_msgSender()]) {
      revert WaitListRewardAlreadyClaimed();
    }

    _claimed[externalId][_msgSender()] = true;

    ExchangeUtils.acquire(_items[externalId], _msgSender(), AllowedTokenTypes(true, true, true, true, true));

    emit WaitListRewardClaimed(_msgSender(), externalId, _items[externalId]);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, CoinHolder) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }
}
