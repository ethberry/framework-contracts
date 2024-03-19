// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {SignerMissingRole} from "../../utils/errors.sol";
import {SignatureValidatorCM} from "../override/SignatureValidator.sol";
import {CMStorage} from "../storage/CMStorage.sol";

import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

contract StakingFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant STAKING_ARGUMENTS_SIGNATURE = "StakingArgs(string contractTemplate)";
  bytes32 private constant STAKING_ARGUMENTS_TYPEHASH = keccak256(STAKING_ARGUMENTS_SIGNATURE);

  bytes32 private immutable STAKING_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,StakingArgs args)", PARAMS_SIGNATURE, STAKING_ARGUMENTS_SIGNATURE));

  struct StakingArgs {
    string contractTemplate;
  }

  event StakingDeployed(address account, uint256 externalId, StakingArgs args);

  function deployStaking(
    Params calldata params,
    StakingArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashStaking(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(params.bytecode, "", params.nonce);

    emit StakingDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = PAUSER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    fixPermissions(account, roles);
    EnumerableSet.add(CMStorage.layout()._minters, account);
  }

  function _hashStaking(Params calldata params, StakingArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(STAKING_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashStakingStruct(args)))
      );
  }

  function _hashStakingStruct(StakingArgs calldata args) private pure returns (bytes32) {
    return keccak256(abi.encode(STAKING_ARGUMENTS_TYPEHASH, keccak256(bytes(args.contractTemplate))));
  }
}
