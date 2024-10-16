// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";

contract ExchangeClaimFacet is SignatureValidator, DiamondOverride {
  event ClaimTemplate(address account, uint256 externalId, Asset[] items);
  event ClaimToken(address account, uint256 externalId, Asset[] items);

  constructor() SignatureValidator() {}

  // mint NFTs to msgSender
  function claim(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverManyToManySignature(params, items, new Asset[](0), signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), AllowedTokenTypes(false, false, true, true, true));

    emit ClaimTemplate(_msgSender(), params.externalId, items);
  }

  // send Coins and NFTs from merchant to msgSender
  function spend(Params memory params, Asset[] memory items, bytes calldata signature) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverManyToManySignature(params, items, new Asset[](0), signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(items, params.receiver, _msgSender(), AllowedTokenTypes(false, true, true, true, true));

    emit ClaimToken(_msgSender(), params.externalId, items);
  }
}
