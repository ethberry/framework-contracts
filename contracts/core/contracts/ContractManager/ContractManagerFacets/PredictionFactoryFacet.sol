// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignerMissingRole } from "../../utils/errors.sol";
import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

contract PredictionFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant PREDICTION_ARGUMENTS_SIGNATURE = "PredictionArgs(string contractTemplate)";
  bytes32 private constant PREDICTION_ARGUMENTS_TYPEHASH = keccak256(PREDICTION_ARGUMENTS_SIGNATURE);

  bytes32 private immutable PREDICTION_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,PredictionArgs args)", PARAMS_SIGNATURE, PREDICTION_ARGUMENTS_SIGNATURE));

  struct PredictionArgs {
    string contractTemplate;
  }

  event PredictionDeployed(address account, uint256 externalId, PredictionArgs args);

  function deployPrediction(
    Params calldata params,
    PredictionArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _validateParams(params);

    address signer = _recoverSigner(_hashPrediction(params, args), signature);
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(params.bytecode, "", params.nonce);

    emit PredictionDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = PAUSER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    fixPermissions(account, roles);
  }

  function _hashPrediction(Params calldata params, PredictionArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(PREDICTION_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashPredictionStruct(args)))
      );
  }

  function _hashPredictionStruct(PredictionArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          PREDICTION_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
