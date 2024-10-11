// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { SignatureValidator } from "../override/SignatureValidator.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";

contract ExchangeCraftFacet is SignatureValidator, DiamondOverride {
  event Craft(address account, uint256 externalId, Asset[] items, Asset[] price);

  constructor() SignatureValidator() {}

  function craft(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverManyToManySignature(params, items, price, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.burnFrom(
      price,
      _msgSender(),
      AllowedTokenTypes(false, true, true, true, true)
    );

    ExchangeUtils.acquireFrom(
      items,
      params.receiver,
      _msgSender(),
      AllowedTokenTypes(false, true, true, true, true)
    );

    emit Craft(_msgSender(), params.externalId, items, price);
  }
}
