// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { MINTER_ROLE, DEFAULT_ADMIN_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignerMissingRole } from "../../utils/errors.sol";
import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset, DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";

/**
 * @title VestingFactory
 * @dev Extension that provides functionality for deployment of Vesting contracts
 */
contract VestingFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant VESTING_ARGUMENTS_SIGNATURE =
    "VestingArgs(address owner,uint64 startTimestamp,uint16 cliffInMonth,uint16 monthlyRelease,string contractTemplate)";
  bytes32 private constant VESTING_ARGUMENTS_TYPEHASH = keccak256(VESTING_ARGUMENTS_SIGNATURE);

  bytes private constant ASSET_SIGNATURE = "Asset(uint256 tokenType,address token,uint256 tokenId,uint256 amount)";
  bytes32 private constant ASSET_TYPEHASH = keccak256(abi.encodePacked(ASSET_SIGNATURE));

  bytes32 private immutable VESTING_PERMIT_SIGNATURE =
    keccak256(
      bytes.concat(
        "EIP712(Params params,VestingArgs args,Asset[] items)",
        ASSET_SIGNATURE,
        PARAMS_SIGNATURE,
        VESTING_ARGUMENTS_SIGNATURE
      )
    );

  // Structure representing Vesting template and arguments
  struct VestingArgs {
    address owner;
    uint64 startTimestamp; // in sec
    uint16 cliffInMonth; // in sec
    uint16 monthlyRelease;
    string contractTemplate;
  }

  event VestingDeployed(address account, uint256 externalId, VestingArgs args, Asset[] items);

  /**
   * @dev Deploys a vesting contract with the specified arguments.
   *
   * @param params struct containing bytecode and nonce.
   * @param args The arguments for the vesting contract deployment.
   * @param signature The signature provided to verify the transaction.
   * @return account address of the deployed vesting contract
   */
  function deployVesting(
    Params calldata params,
    VestingArgs calldata args,
    Asset[] memory items,
    bytes calldata signature
  ) external returns (address account) {
    // Check that the transaction with the same nonce was not executed yet
    _checkNonce(params.nonce);

    // Recover the signer from signature
    address signer = _recoverSigner(_hashVesting(params, args, items), signature);
    // verify that signer has required permissions
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    // Deploy the contract
    account = deploy2(
      params.bytecode,
      abi.encode(args.owner, args.startTimestamp, args.cliffInMonth, args.monthlyRelease),
      params.nonce
    );

    ExchangeUtils.spendFrom(items, signer, account, DisabledTokenTypes(true, false, true, true, true));

    // Notify our server about successful deployment
    emit VestingDeployed(account, params.externalId, args, items);
  }

  /**
   * @dev Computes the hash of the vesting contract arguments and deployment params.
   *
   * @param params struct containing bytecode and nonce
   * @param args The arguments for the vesting contract deployment.
   * @param items Vested asset
   * @return bytes32 The keccak256 hash of the arguments and params.
   */
  function _hashVesting(
    Params calldata params,
    VestingArgs calldata args,
    Asset[] memory items
  ) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encodePacked(
            VESTING_PERMIT_SIGNATURE,
            _hashParamsStruct(params),
            _hashVestingStruct(args),
            _hashAssetStructArray(items)
          )
        )
      );
  }

  /**
   * @dev Computes the hash of the vesting contract arguments.
   *
   * @param args The arguments for the vesting contract deployment.
   * @return bytes32 The keccak256 hash of the arguments.
   */
  function _hashVestingStruct(VestingArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          VESTING_ARGUMENTS_TYPEHASH,
          args.owner,
          args.startTimestamp,
          args.cliffInMonth,
          args.monthlyRelease,
          keccak256(bytes(args.contractTemplate))
        )
      );
  }

  function _hashAssetStruct(Asset memory item) private pure returns (bytes32) {
    return keccak256(abi.encode(ASSET_TYPEHASH, item.tokenType, item.token, item.tokenId, item.amount));
  }

  function _hashAssetStructArray(Asset[] memory items) private pure returns (bytes32) {
    uint256 length = items.length;
    bytes32[] memory padded = new bytes32[](length);
    for (uint256 i = 0; i < length; ) {
      padded[i] = _hashAssetStruct(items[i]);
      unchecked {
        i++;
      }
    }
    return keccak256(abi.encodePacked(padded));
  }
}
