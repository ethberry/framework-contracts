// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {SignerMissingRole} from "../../utils/errors.sol";
import {SignatureValidatorCM} from "../override/SignatureValidator.sol";
import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

contract PonziFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant PONZI_ARGUMENTS_SIGNATURE =
    "PonziArgs(address[] payees,uint256[] shares,string contractTemplate)";
  bytes32 private constant PONZI_ARGUMENTS_TYPEHASH = keccak256(PONZI_ARGUMENTS_SIGNATURE);

  bytes32 private immutable PONZI_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,PonziArgs args)", PARAMS_SIGNATURE, PONZI_ARGUMENTS_SIGNATURE));

  struct PonziArgs {
    address[] payees;
    uint256[] shares;
    string contractTemplate;
  }

  event PonziDeployed(address account, uint256 externalId, PonziArgs args);

  function deployPonzi(
    Params calldata params,
    PonziArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashPonzi(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(params.bytecode, abi.encode(args.payees, args.shares), params.nonce);

    emit PonziDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = PAUSER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    fixPermissions(account, roles);
  }

  function _hashPonzi(Params calldata params, PonziArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(PONZI_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashPonziStruct(args)))
      );
  }

  function _hashPonziStruct(PonziArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          PONZI_ARGUMENTS_TYPEHASH,
          keccak256(abi.encodePacked(args.payees)),
          keccak256(abi.encodePacked(args.shares)),
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
