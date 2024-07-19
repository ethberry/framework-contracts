// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { METADATA_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { IERC721Discrete } from "../../ERC721/interfaces/IERC721Discrete.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { SignerMissingRole } from "../../utils/errors.sol";

contract ExchangeGradeFacet is SignatureValidator, DiamondOverride {
  event Upgrade(address account, uint256 externalId, Asset item, Asset[] price, bytes32 attribute, uint256 level);

  constructor() SignatureValidator() {}

  function upgrade(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    if (!_hasRole(METADATA_ROLE, _recoverOneToManySignature(params, item, price, signature))) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(price, _msgSender(), params.receiver, AllowedTokenTypes(true, true, false, false, true));

    uint256 level = IERC721Discrete(item.token).upgrade(item.tokenId, params.extra);

    emit Upgrade(_msgSender(), params.externalId, item, price, params.extra, level);

    _afterPurchase(params.referrer, price);
  }
}
