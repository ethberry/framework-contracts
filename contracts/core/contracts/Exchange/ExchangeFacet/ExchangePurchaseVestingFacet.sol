// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {MINTER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {DiamondOverride} from "../../Diamond/override/DiamondOverride.sol";
import {ExchangeUtils} from "../../Exchange/lib/ExchangeUtils.sol";
import {SignatureValidator} from "../override/SignatureValidator.sol";
import {Asset, Params, DisabledTokenTypes} from "../lib/interfaces/IAsset.sol";
import {SignerMissingRole, NotExist} from "../../utils/errors.sol";

import "../interfaces/IVesting.sol";

contract ExchangePurchaseVestingFacet is SignatureValidator, DiamondOverride {
  using SafeCast for uint256;

  event PurchaseVesting(address newOwner, address vesting, uint256 externalId, Asset[] price);


  constructor() SignatureValidator() {}

  /**
   * @dev Lend an asset to borrower by spending price from owner and setting user
   *
   * @param params Struct of Params that containing the signature parameters.
   * @param item An Assets that will be lent.
   * @param price An Assets[] that will be used as payment.
   * @param signature Signature used to sign the message.
   */
  function purchaseVesting(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    // TODO new _recover function
    if (!_hasRole(MINTER_ROLE, _recoverOneToManySignature(params, item, price, signature))) {
      revert SignerMissingRole();
    }

    if (params.receiver == address(0)) {
      revert NotExist();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, DisabledTokenTypes(false, false, false, false, false));

    IVesting(item.token).transferOwnership(_msgSender());

    emit PurchaseVesting(_msgSender(), item.token, params.externalId, price);

    _afterPurchase(params.referrer, price);
  }
}
