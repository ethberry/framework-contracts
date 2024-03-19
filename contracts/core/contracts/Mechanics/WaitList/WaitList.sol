// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
//
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {Expired,NotInList,NotExist,WrongAmount,AlreadyExist} from "../../utils/errors.sol";
import {TopUp} from "../../utils/TopUp.sol";
import {ExchangeUtils} from "../../Exchange/lib/ExchangeUtils.sol";
import {Asset,Params,TokenType,DisabledTokenTypes} from "../../Exchange/lib/interfaces/IAsset.sol";

contract WaitList is AccessControl, Pausable, TopUp {
  mapping(uint256 => bytes32) internal _roots;
  mapping(uint256 => mapping(address => bool)) internal _expired;
  mapping(uint256 => Asset[]) internal _items;

  event WaitListRewardSet(uint256 externalId, bytes32 root, Asset[] items);
  event WaitListRewardClaimed(address account, uint256 externalId, Asset[] items);

  constructor() {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  function setReward(Params memory params, Asset[] memory items) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (_roots[params.externalId] != "") {
      revert AlreadyExist();
    }

    _roots[params.externalId] = params.extra;

    if (items.length == 0) {
      revert WrongAmount();
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
      revert NotExist();
    }

    // should be
    // keccak256(abi.encodePacked(_msgSender()))
    bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(_msgSender()))));
    bool verified = MerkleProof.verifyCalldata(proof, _roots[externalId], leaf);

    if (!verified) {
      revert NotInList();
    }

    if (_expired[externalId][_msgSender()]) {
      revert Expired();
    }

    _expired[externalId][_msgSender()] = true;

    ExchangeUtils.acquire(_items[externalId], _msgSender(), DisabledTokenTypes(false, false, false, false, false));

    emit WaitListRewardClaimed(_msgSender(), externalId, _items[externalId]);
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, TopUp) returns (bool) {
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
