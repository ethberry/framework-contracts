// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { MINTER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";
import { IERC721GeneralizedCollection } from "@ethberry/contracts-erc721/contracts/interfaces/IERC721GeneralizedCollection.sol";

import { PREGNANCY_COUNTER, PREGNANCY_TIMESTAMP } from "../../Mechanics/Genes/attributes.sol";
import { IERC721Genes } from "../../Mechanics/Genes/interfaces/IERC721Genes.sol";
import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { IGenesErrors } from "../interfaces/IGenesErrors.sol";
import { Referral } from "../../Mechanics/Referral/Referral.sol";

contract ExchangeGenesFacet is IGenesErrors, SignatureValidator, DiamondOverride, Referral {
  event PurchaseGenes(address account, uint256 externalId, /* template.id */ Asset item, Asset[] price);
  event Breed(address account, uint256 externalId, Asset matron, Asset sire);

  uint256 public constant PREGNANCY_THRESHOLD_LIMIT = 3;
  uint256 public constant PREGNANCY_FREQUENCY_LIMIT = 7 days;

  constructor() SignatureValidator() {}

  function purchaseGenes(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) external payable whenNotPaused {
    _validateParams(params);

    address signer = _recoverOneToManySignature(params, item, price, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    ExchangeUtils.spendFrom(
      price,
      _msgSender(),
      params.receiver,
      AllowedTokenTypes(true, true, false, false, true)
    );

    uint256 tokenId = IERC721Genes(item.token).mintGenes(_msgSender(), item.tokenId, uint256(params.extra));

    // replace templateId with actual tokenId
    item.tokenId = tokenId;

    emit PurchaseGenes(_msgSender(), params.externalId, item, price);

    _afterPurchase(params.referrer, price);
  }

  function breed(
    Params memory params,
    Asset memory mother,
    Asset memory father,
    bytes calldata signature
  ) external payable whenNotPaused {
    // Check allowance
    if (mother.token != father.token) {
      revert GenesDifferentContracts();
    }

    // Check pregnancy for mother
    _checkPregnancyThreshold(mother.token, mother.tokenId);
    _checkPregnancyFrequency(mother.token, mother.tokenId);

    // Check pregnancy for father
    _checkPregnancyThreshold(father.token, father.tokenId);
    _checkPregnancyFrequency(father.token, father.tokenId);

    _validateParams(params);

    address signer = _recoverOneToOneSignature(params, mother, father, signature);
    if (!_hasRole(MINTER_ROLE, signer)) {
      revert SignerMissingRole();
    }

    IERC721Genes(mother.token).breed(params.receiver, mother.tokenId, father.tokenId);

    emit Breed(_msgSender(), params.externalId, mother, father);
  }

  function _checkPregnancyThreshold(address token, uint256 tokenId) internal view {
    uint256 pregnancyCounter = IERC721GeneralizedCollection(token).getRecordFieldValue(tokenId, PREGNANCY_COUNTER);
    if (pregnancyCounter >= PREGNANCY_THRESHOLD_LIMIT) {
      revert PregnancyThresholdExceeded(pregnancyCounter, PREGNANCY_THRESHOLD_LIMIT);
    }
  }

  function _checkPregnancyFrequency(address token, uint256 tokenId) internal view {
    uint256 pregnancyTimestamp = IERC721GeneralizedCollection(token).getRecordFieldValue(tokenId, PREGNANCY_TIMESTAMP);
    if (block.timestamp - pregnancyTimestamp < PREGNANCY_FREQUENCY_LIMIT) {
      revert PregnancyFrequencyExceeded(pregnancyTimestamp, block.timestamp);
    }
  }
}
