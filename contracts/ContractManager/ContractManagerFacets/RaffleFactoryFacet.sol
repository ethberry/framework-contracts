// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

import { MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

contract RaffleFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes32 private immutable RAFFLE_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params)", PARAMS_SIGNATURE));

  event RaffleDeployed(address account, uint256 externalId);

  function deployRaffle(Params calldata params, bytes calldata signature) external returns (address account) {
    _validateParams(params);

    address signer = _recoverSigner(_hashRaffle(params), signature);
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    bytes memory bytecode = abi.encodePacked(params.bytecode, "");
    account = Create2.computeAddress(params.nonce, keccak256(bytecode));
    emit RaffleDeployed(account, params.externalId);
    Create2.deploy(0, params.nonce, bytecode);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = PAUSER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    fixPermissions(account, roles);
  }

  function _hashRaffle(Params calldata params) internal view returns (bytes32) {
    return _hashTypedDataV4(keccak256(abi.encodePacked(RAFFLE_PERMIT_SIGNATURE, _hashParamsStruct(params))));
  }
}
