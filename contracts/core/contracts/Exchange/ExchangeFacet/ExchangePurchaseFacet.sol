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
import { SignerMissingRole } from "../../utils/errors.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangePurchaseFacet is SignatureValidator, DiamondOverride, Referral {
  event Purchase(address account, uint256 externalId, /* template.id */ Asset item, Asset[] price);

  constructor() SignatureValidator() {}

  function purchase(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverOneToManySignature(params, item, price, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(
      price,
      _msgSender(),
      params.receiver,
      AllowedTokenTypes(true, true, false, false, true)
    );

    ExchangeUtils.acquireFrom(
      ExchangeUtils._toArray(item),
      params.receiver,
      _msgSender(),
      AllowedTokenTypes(false, false, true, true, true)
    );

    emit Purchase(_msgSender(), params.externalId, item, price);

    _afterPurchase(params.referrer, price);
  }
}
