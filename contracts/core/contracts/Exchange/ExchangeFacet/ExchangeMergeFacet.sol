// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { TEMPLATE_ID } from "@gemunion/contracts-utils/contracts/attributes.sol";
import { IERC721GeneralizedCollection } from "@gemunion/contracts-erc721/contracts/interfaces/IERC721GeneralizedCollection.sol";

import { SignatureValidator } from "../override/SignatureValidator.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, Params, DisabledTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole, WrongToken } from "../../utils/errors.sol";

contract ExchangeMergeFacet is SignatureValidator, DiamondOverride {
  event Merge(address account, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  function merge(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, price, signature))) {
      revert SignerMissingRole();
    }

    uint256 expectedId = uint256(params.extra);

    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory item = price[i];

      // check for same contract
      if (i > 0 && item.token != price[0].token) {
        revert WrongToken();
      }

      // todo should we try..catch call?
      // check for token existence with correct metadata
      uint256 templateId = IERC721GeneralizedCollection(item.token).getRecordFieldValue(item.tokenId, TEMPLATE_ID);

      // check for same template
      if (expectedId != 0 && templateId != expectedId) {
        revert WrongToken();
      }

      unchecked {
        i++;
      }
    }

    // burn or send price to receiver
    ExchangeUtils.burnFrom(price, _msgSender(), params.receiver, DisabledTokenTypes(false, false, false, false, false));
    ExchangeUtils.acquireFrom(items, params.receiver, _msgSender(), DisabledTokenTypes(false, false, false, false, false));

    emit Merge(_msgSender(), params.externalId, items, price);

    _afterPurchase(params.referrer, price);
  }
}
