// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes, TokenType } from "../lib/interfaces/IAsset.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";
import { IERC721Simple } from "../../ERC721/interfaces/IERC721Simple.sol";
import { IERC1155Simple } from "../../ERC1155/interfaces/IERC1155Simple.sol";

contract ExchangePurchaseFacet is SignatureValidator, DiamondOverride, Referral {
  event Purchase(address account, uint256 externalId, /* template.id */ Asset item, Asset[] price);
  error UnsupportedTokenType();

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
