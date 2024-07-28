// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IERC721LootBox, LootBoxConfig} from "../../Mechanics/LootBox/interfaces/IERC721LootBox.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole, WrongAmount } from "../../utils/errors.sol";
import { Referral } from "../../Referral/Referral.sol";

contract ExchangeLootBoxFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseLootBox(address account, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  function purchaseLoot(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    LootBoxConfig calldata boxConfig,
    bytes calldata signature
  ) external payable whenNotPaused {

    // TODO need to validate LootBoxConfig

    if (!_hasRole(MINTER_ROLE, _recoverManyToManySignature(params, items, price, signature))) {
      revert SignerMissingRole();
    }

    if (items.length == 0) {
      revert WrongAmount();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, AllowedTokenTypes(true, true, false, false, true));

    Asset memory box = items[items.length - 1];

    // pop from array is not supported
    Asset[] memory lootItems = new Asset[](items.length - 1);
    uint256 length = items.length;
    for (uint256 i = 0; i < length - 1; ) {
      lootItems[i] = items[i];
      unchecked {
        i++;
      }
    }

    IERC721LootBox(box.token).mintBox(_msgSender(), box.tokenId, lootItems, boxConfig);

    emit PurchaseLootBox(_msgSender(), params.externalId, items, price);

    _afterPurchase(params.referrer, price);
  }
}
