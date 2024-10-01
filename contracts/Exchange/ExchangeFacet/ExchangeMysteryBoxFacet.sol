// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IERC721MysteryBox } from "../../Mechanics/MysteryBox/interfaces/IERC721MysteryBox.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangeMysteryBoxFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseMysteryBox(address account, uint256 externalId, Asset item, Asset[] price, Asset[] content);

  constructor() SignatureValidator() {}

  function purchaseMystery(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    Asset[] memory content,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    bytes32 config = keccak256(new bytes(0));

    address signer = _recoverOneToManyToManySignature(params, item, price, content, config, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, AllowedTokenTypes(true, true, false, false, true));

    IERC721MysteryBox(item.token).mintBox(_msgSender(), item.tokenId, content);

    emit PurchaseMysteryBox(_msgSender(), params.externalId, item, price, content);
  }
}
