// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { ILottery } from "../../Mechanics/Lottery/interfaces/ILottery.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangeLotteryFacet is SignatureValidator, DiamondOverride, Referral {
  event PurchaseLottery(address account, uint256 externalId, Asset item, Asset price);

  constructor() SignatureValidator() {}

  function purchaseLottery(
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

    Asset[] memory _price = ExchangeUtils._toArray(price);

    ExchangeUtils.spendFrom(
      ExchangeUtils._toArray(price),
      _msgSender(),
      address(this),
      AllowedTokenTypes(true, true, false, false, false)
    );

    IERC20(price.token).approve(params.receiver, price.amount);

    uint256 tokenId = ILottery(params.receiver).printTicket(
      params.externalId,
      _msgSender(),
      params.extra, // selected numbers
      price
    );

    // set tokenID = ticketID
    item.tokenId = tokenId;

    emit PurchaseLottery(_msgSender(), params.externalId, item, price);

    _afterPurchase(params.referrer, _price);
  }
}
