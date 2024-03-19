// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {SignerMissingRole} from "../../utils/errors.sol";
import {SignatureValidatorCM} from "../override/SignatureValidator.sol";
import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

contract LotteryFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  struct LotteryConfig {
    uint256 timeLagBeforeRelease;
    uint256 commission;
  }

  bytes private constant LOTTERY_CONFIG_SIGNATURE = "LotteryConfig(uint256 timeLagBeforeRelease,uint256 commission)";
  bytes32 private constant LOTTERY_CONFIG_TYPEHASH = keccak256(LOTTERY_CONFIG_SIGNATURE);

  bytes private constant LOTTERY_ARGUMENTS_SIGNATURE = "LotteryArgs(LotteryConfig config)";
  bytes32 private constant LOTTERY_ARGUMENTS_TYPEHASH = keccak256(LOTTERY_ARGUMENTS_SIGNATURE);

  bytes32 private immutable LOTTERY_FULL_TYPEHASH =
    keccak256(bytes.concat(LOTTERY_ARGUMENTS_SIGNATURE, LOTTERY_CONFIG_SIGNATURE));

  bytes32 private immutable LOTTERY_PERMIT_SIGNATURE =
    keccak256(
      bytes.concat(
        "EIP712(Params params,LotteryArgs args)",
        LOTTERY_ARGUMENTS_SIGNATURE,
        LOTTERY_CONFIG_SIGNATURE,
        PARAMS_SIGNATURE
      )
    );

  struct LotteryArgs {
    LotteryConfig config;
  }

  event LotteryDeployed(address account, uint256 externalId, LotteryArgs args);

  function deployLottery(
    Params calldata params,
    LotteryArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashLottery(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(
      params.bytecode,
      abi.encode(args.config.timeLagBeforeRelease, args.config.commission),
      params.nonce
    );

    emit LotteryDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = PAUSER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    fixPermissions(account, roles);
  }

  function _hashLottery(Params calldata params, LotteryArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(LOTTERY_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashLotteryStruct(args)))
      );
  }

  function _hashLotteryStruct(LotteryArgs calldata args) private view returns (bytes32) {
    return keccak256(abi.encode(LOTTERY_FULL_TYPEHASH, _hashLotteryConfigStruct(args.config)));
  }

  function _hashLotteryConfigStruct(LotteryConfig calldata config) private pure returns (bytes32) {
    return keccak256(abi.encode(LOTTERY_CONFIG_TYPEHASH, config.timeLagBeforeRelease, config.commission));
  }
}
