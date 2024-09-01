// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";

contract ExchangeClaimFacet is SignatureValidator, DiamondOverride {
  event Claim(address account, uint256 externalId, Asset[] items);

  constructor() SignatureValidator() {}

  // mint NFTs to msgSender
  function claim(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverManyToManySignature(params, items, new Asset[](0), signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    if (uint256(params.extra) != 0) {
      if (block.timestamp > uint256(params.extra)) {
        revert ExpiredSignature();
      }
    }

    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), AllowedTokenTypes(false, false, true, true, true));

    emit Claim(_msgSender(), params.externalId, items);
  }

  // send Coins and NFTs from merchant to msgSender
  function spend(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverManyToManySignature(params, items, new Asset[](0), signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    if (uint256(params.extra) != 0) {
      if (block.timestamp > uint256(params.extra)) {
        revert ExpiredSignature();
      }
    }

    ExchangeUtils.spendFrom(items, params.receiver, _msgSender(), AllowedTokenTypes(false, true, true, true, true));

    emit Claim(_msgSender(), params.externalId, items);
  }
}
