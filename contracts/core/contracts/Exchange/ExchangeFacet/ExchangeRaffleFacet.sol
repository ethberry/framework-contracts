// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { IRaffle } from "../../Mechanics/Raffle/interfaces/IRaffle.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole, NotExist, WrongToken } from "../../utils/errors.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangeRaffleFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseRaffle(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, uint256 index);

  constructor() SignatureValidator() {}

  function purchaseRaffle(
    Params memory params,
    Asset memory item, // ticket contract
    Asset memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverOneToOneSignature(params, item, price, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    // this is questionable
    if (item.token == address(0)) {
      revert WrongToken();
    }

    // Double-check lottery address
    if (params.receiver == address(0)) {
      revert NotExist();
    }

    Asset[] memory _price = ExchangeUtils._toArray(price);

    ExchangeUtils.spendFrom(
      _price,
      _msgSender(),
      params.receiver, // RAFFLE CONTRACT
      AllowedTokenTypes(true, true, false, false, true)
    );

    (uint256 tokenId, uint256 roundId, uint256 index) = IRaffle(params.receiver).printTicket(
      params.externalId,
      _msgSender()
    );

    // set tokenID = ticketID
    item.tokenId = tokenId;

    emit PurchaseRaffle(_msgSender(), params.externalId, item, price, roundId, index);

    _afterPurchase(params.referrer, _price);
  }
}
