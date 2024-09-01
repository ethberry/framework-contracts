// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IERC721LootBox } from "../../Mechanics/LootBox/interfaces/IERC721LootBox.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangeLootBoxFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseLootBox(address account, uint256 externalId, Asset item, Asset[] price, Asset[] content);

  constructor() SignatureValidator() {}

  function purchaseLoot(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    Asset[] memory content,
    IERC721LootBox.LootBoxConfig calldata boxConfig,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    bytes32 config = keccak256(abi.encode(boxConfig.min, boxConfig.max));

    address signer = _recoverOneToManyToManySignature(params, item, price, content, config, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, AllowedTokenTypes(true, true, false, false, true));

    IERC721LootBox(item.token).mintBox(_msgSender(), item.tokenId, content, boxConfig);

    emit PurchaseLootBox(_msgSender(), params.externalId, item, price, content);

    _afterPurchase(params.referrer, price);
  }
}
