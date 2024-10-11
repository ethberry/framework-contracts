// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { IDiamondErrors } from "../../Diamond/interfaces/IDiamondErrors.sol";
import { IDiamondInitErrors } from "../../Diamond/interfaces/IDiamondInitErrors.sol";
import { ISignatureValidatorErrors } from "../../Exchange/interfaces/ISignatureValidatorErrors.sol";
import { ITokenValidationErrors } from "../../Exchange/interfaces/ITokenValidationErrors.sol";
import { IGenesErrors } from "../../Exchange/interfaces/IGenesErrors.sol";
import { IRentableErrors } from "../../Exchange/interfaces/IRentableErrors.sol";
import { IMergeErrors } from "../../Exchange/interfaces/IMergeErrors.sol";
import { IERC721SimpleErrors } from "../../ERC721/interfaces/IERC721SimpleErrors.sol";
import { IERC721BoxErrors } from "../../ERC721/interfaces/IERC721BoxErrors.sol";
import { IERC721GenesErrors } from "../../Mechanics/Genes/interfaces/IERC721GenesErrors.sol";
import { IPredictionErrors } from "../../Mechanics/Prediction/interfaces/IPredictionErrors.sol";
import { ILotteryErrors } from "../../Mechanics/Lottery/interfaces/ILotteryErrors.sol";
import { IRaffleErrors } from "../../Mechanics/Raffle/interfaces/IRaffleErrors.sol";
import { IStakingErrors } from "../../Mechanics/Staking/interfaces/IStakingErrors.sol";
import { IPonziErrors } from "../../Mechanics/Ponzi/interfaces/IPonziErrors.sol";
import { IWaitListErrors } from "../../Mechanics/WaitList/interfaces/IWaitListErrors.sol";

contract ErrorsIdCalculator is
  IDiamondErrors,
  IDiamondInitErrors,
  ISignatureValidatorErrors,
  ITokenValidationErrors,
  IMergeErrors,
  IGenesErrors,
  IRentableErrors,
  IERC721SimpleErrors,
  IERC721BoxErrors,
  IERC721GenesErrors,
  IPredictionErrors,
  ILotteryErrors,
  IRaffleErrors,
  IStakingErrors,
  IPonziErrors,
  IWaitListErrors
{}
