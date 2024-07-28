// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { ILottery } from "../../Mechanics/Lottery/interfaces/ILottery.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole, NotExist, WrongToken } from "../../utils/errors.sol";
import { Referral } from "../../Referral/Referral.sol";

contract ExchangeLotteryFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseLottery(address account, uint256 externalId, Asset item, Asset price, uint256 roundId, bytes32 numbers);

  constructor() SignatureValidator() {}

  function purchaseLottery(
    Params memory params,
    Asset memory item, // ticket contract
    Asset memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    // Verify signature and check signer for MINTER_ROLE
    if (!_hasRole(MINTER_ROLE, _recoverOneToOneSignature(params, item, price, signature))) {
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
      params.receiver, // LOTTERY CONTRACT
      AllowedTokenTypes(true, true, false, false, true)
    );

    (uint256 tokenId, uint256 roundId) = ILottery(params.receiver).printTicket(
      params.externalId,
      _msgSender(),
      params.extra // selected numbers
    );

    // set tokenID = ticketID
    item.tokenId = tokenId;

    emit PurchaseLottery(_msgSender(), params.externalId, item, price, roundId, params.extra);

    _afterPurchase(params.referrer, _price);
  }
}
