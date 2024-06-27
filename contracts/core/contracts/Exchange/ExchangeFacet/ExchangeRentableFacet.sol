// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { IERC4907 } from "@gemunion/contracts-erc721/contracts/interfaces/IERC4907.sol";

import { METADATA_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, DisabledTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole, WrongAmount } from "../../utils/errors.sol";

contract ExchangeRentableFacet is SignatureValidator, DiamondOverride {
  using SafeCast for uint256;

  event Lend(address account, address to, uint64 expires, uint256 externalId, Asset item, Asset[] price);
  event LendMany(address account, address to, uint64 expires, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  /**
   * @dev Lend an asset to borrower by spending price from owner and setting user
   *
   * @param params Struct of Params that containing the signature parameters.
   * @param item An Assets that will be lent.
   * @param price An Assets[] that will be used as payment.
   * @param signature Signature used to sign the message.
   */
  function lend(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    if (!_hasRole(METADATA_ROLE, _recoverOneToManySignature(params, item, price, signature))) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, DisabledTokenTypes(false, false, false, false, false));

    IERC4907(item.token).setUser(
      item.tokenId,
      params.referrer /* to */,
      uint256(params.extra).toUint64() /* lend expires */
    );

    emit Lend(
      _msgSender() /* from */,
      params.referrer /* to */,
      uint256(params.extra).toUint64() /* lend expires */,
      params.externalId /* lendRule db id */,
      item,
      price
    );

    _afterPurchase(params.referrer, price);
  }

  function lendMany(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    if (!_hasRole(METADATA_ROLE, _recoverManyToManySignature(params, items, price, signature))) {
      revert SignerMissingRole();
    }

    if (items.length == 0) {
      revert WrongAmount();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, DisabledTokenTypes(false, false, false, false, false));

    emit LendMany(
      _msgSender() /* from */,
      params.referrer /* to */,
      uint256(params.extra).toUint64() /* lend expires */,
      params.externalId /* lendRule db id */,
      items,
      price
    );

    _afterPurchase(params.referrer, price);

  for (uint256 i = 0; i < items.length; ) {
      IERC4907(items[i].token).setUser(
        items[i].tokenId,
        params.referrer /* to */,
        uint256(params.extra).toUint64() /* lend expires */
      );
      unchecked {
        i++;
      }
    }
  }
}
