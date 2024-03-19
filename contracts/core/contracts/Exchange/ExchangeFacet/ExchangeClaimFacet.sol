// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {MINTER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {DiamondOverride} from "../../Diamond/override/DiamondOverride.sol";
import {ExchangeUtils} from "../../Exchange/lib/ExchangeUtils.sol";
import {SignatureValidator} from "../override/SignatureValidator.sol";
import {Asset, Params, DisabledTokenTypes} from "../lib/interfaces/IAsset.sol";
import {ExpiredSignature, SignerMissingRole} from "../../utils/errors.sol";

contract ExchangeClaimFacet is SignatureValidator, DiamondOverride {
  event Claim(address account, uint256 externalId, Asset[] items);

  constructor() SignatureValidator() {}

  // mint NFT to msgSender
  function claim(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, new Asset[](0), signature))) {
      revert SignerMissingRole();
    }

    if (uint256(params.extra) != 0) {
      if (block.timestamp > uint256(params.extra)) {
        revert ExpiredSignature();
      }
    }

    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), DisabledTokenTypes(false, false, false, false, false));

    emit Claim(_msgSender(), params.externalId, items);
  }

  // send NFT to msgSender from merchant (params.receiver)
  function spend(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, new Asset[](0), signature))) {
      revert SignerMissingRole();
    }

    if (uint256(params.extra) != 0) {
      if (block.timestamp > uint256(params.extra)) {
        revert ExpiredSignature();
      }
    }

    ExchangeUtils.spendFrom(items, params.receiver, _msgSender(), DisabledTokenTypes(false, false, false, false, false));

    emit Claim(_msgSender(), params.externalId, items);
  }
}
