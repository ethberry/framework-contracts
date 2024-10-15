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
import { Referral } from "../../Mechanics/Referral/Referral.sol";
import { IERC721Random } from "../../Mechanics/Random/interfaces/IERC721Random.sol";

contract ExchangeRandomFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseRandom(address account, uint256 externalId, Asset item, Asset[] price);

  constructor() SignatureValidator() {}

  function purchaseRandom(
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

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, AllowedTokenTypes(true, true, false, false, true));

    IERC721Random(item.token).mintRandom(_msgSender(), item.tokenId);

    emit PurchaseRandom(_msgSender(), params.externalId, item, price);

    _afterPurchase(params.referrer, price);
  }
}
