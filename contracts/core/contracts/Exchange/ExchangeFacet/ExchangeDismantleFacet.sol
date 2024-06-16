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

contract ExchangeDismantleFacet is SignatureValidator, DiamondOverride {
  event Dismantle(address account, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  function dismantle(
    Params memory params,
    Asset[] memory items, // items to get
    Asset memory price, // item to dismantle
    bytes calldata signature
  ) external payable whenNotPaused {
    Asset[] memory _price = ExchangeUtils._toArray(price);

    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, _price, signature))) {
      revert SignerMissingRole();
    }

    // burn price (721, 998, 1155) or send price to receiver
    ExchangeUtils.burnFrom(_price, _msgSender(), DisabledTokenTypes(true, true, false, false, false));
    // send items to sender from receiver
    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), DisabledTokenTypes(true, false, false, false, false));

    emit Dismantle(_msgSender(), params.externalId, items, _price);

    _afterPurchase(params.referrer, _price);
  }
}
