// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {EIP712} from "./EIP712Upgradable.sol";
import {ExpiredSignature} from "../../utils/errors.sol";

import {SigValStorage} from "../storage/SigValStorage.sol";

contract SignatureValidatorCM is EIP712, Context {
  using ECDSA for bytes32;
  using Address for address;

  bytes internal constant PARAMS_SIGNATURE = "Params(bytes32 nonce,bytes bytecode,uint256 externalId)";
  bytes32 private constant PARAMS_TYPEHASH = keccak256(PARAMS_SIGNATURE);

  bytes private constant ASSET_SIGNATURE = "Asset(uint256 tokenType,address token,uint256 tokenId,uint256 amount)";
  bytes32 private constant ASSET_TYPEHASH = keccak256(abi.encodePacked(ASSET_SIGNATURE));

  struct Params {
    bytes32 nonce;
    bytes bytecode;
    uint256 externalId;
  }

  // constructor() EIP712("ContractManager", "1.0.0") {}
  constructor() EIP712() {}

  /**
   * @dev Recover the address of the signer of transaction
   *
   * @param digest The message digest that was signed.
   * @param signature The signature bytes of the signer.
   * @return The address of the signer of the message.
   */
  function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
    return digest.recover(signature);
  }

  /**
   * @dev Computes the hash of the Params struct for signing purposes.
   *
   * @param params The Params struct to hash.
   * @return The hash of the Params struct.
   */
  function _hashParamsStruct(Params calldata params) internal pure returns (bytes32) {
    return keccak256(abi.encode(PARAMS_TYPEHASH, params.nonce, keccak256(bytes(params.bytecode)), params.externalId));
  }

  /**
   * @dev Prevents transaction replay
   *
   * @param nonce The nonce of the transaction.
   */
  function _checkNonce(bytes32 nonce) internal {
    // Check that the transaction with the same nonce was not executed yet
    if (SigValStorage.layout()._expired[nonce]) {
      revert ExpiredSignature();
    }
    // Mark the transaction as executed.
    SigValStorage.layout()._expired[nonce] = true;
  }
}
