// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { MINTER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { IERC721GeneralizedCollection } from "@gemunion/contracts-erc721/contracts/interfaces/IERC721GeneralizedCollection.sol";

import { PREGNANCY_COUNTER, PREGNANCY_TIMESTAMP } from "../../Mechanics/Genes/attributes.sol";
import { IERC721Genes } from "../../ERC721/interfaces/IERC721Genes.sol";
import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, Params } from "../lib/interfaces/IAsset.sol";
import { PregnancyFrequencyExceeded, PregnancyThresholdExceeded, SignerMissingRole, GenesDifferentContracts } from "../../utils/errors.sol";

import "hardhat/console.sol";

contract ExchangeGenesFacet is SignatureValidator, DiamondOverride {
  event Breed(address account, uint256 externalId, Asset matron, Asset sire);

  uint256 public constant PREGNANCY_THRESHOLD_LIMIT = 3;
  uint256 public constant PREGNANCY_FREQUENCY_LIMIT = 7 days;

  constructor() SignatureValidator() {}

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

    IERC721Genes(mother.token).breed(mother.tokenId, father.tokenId);

    emit Breed(_msgSender(), params.externalId, mother, father);
  }

  function _checkPregnancyThreshold(address token, uint256 tokenId) internal view {
    uint256 pregnancyCounter = IERC721GeneralizedCollection(token).getRecordFieldValue(tokenId, PREGNANCY_COUNTER);
    console.log("[ExchangeGenesFacet] Pregnancy Counter for token", tokenId, ":", pregnancyCounter);
    if (pregnancyCounter >= PREGNANCY_THRESHOLD_LIMIT) {
      revert PregnancyThresholdExceeded(pregnancyCounter, PREGNANCY_THRESHOLD_LIMIT);
    }
  }

  function _checkPregnancyFrequency(address token, uint256 tokenId) internal view {
    uint256 pregnancyTimestamp = IERC721GeneralizedCollection(token).getRecordFieldValue(tokenId, PREGNANCY_TIMESTAMP);
    console.log("[ExchangeGenesFacet] Pregnancy Timestamp for token", tokenId, ":", pregnancyTimestamp);
    if (block.timestamp - pregnancyTimestamp < PREGNANCY_FREQUENCY_LIMIT) {
      revert PregnancyFrequencyExceeded(pregnancyTimestamp, block.timestamp);
    }
  }
}
