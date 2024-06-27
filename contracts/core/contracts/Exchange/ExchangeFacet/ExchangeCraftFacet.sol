// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignatureValidator } from "../override/SignatureValidator.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, Params, DisabledTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole } from "../../utils/errors.sol";

contract ExchangeCraftFacet is SignatureValidator, DiamondOverride {
  event Craft(address account, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  function craft(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, price, signature))) {
      revert SignerMissingRole();
    }

    ExchangeUtils.burnFrom(price, _msgSender(), DisabledTokenTypes(true, false, false, false, false));
    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), DisabledTokenTypes(true, false, false, false, false));

    emit Craft(_msgSender(), params.externalId, items, price);

    _afterPurchase(params.referrer, price);
  }
}
