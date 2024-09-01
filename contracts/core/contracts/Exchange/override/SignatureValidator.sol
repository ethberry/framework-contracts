// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Context } from "@openzeppelin/contracts/utils/Context.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { EIP712 } from "../../Diamond/override/EIP712Upgradable.sol";
import { Asset, Params } from "../lib/interfaces/IAsset.sol";
import { SigValStorage } from "../storage/SigValStorage.sol";
import { ISignatureValidatorErrors } from "../interfaces/ISignatureValidatorErrors.sol";

contract SignatureValidator is EIP712, Context, ISignatureValidatorErrors {
  using ECDSA for bytes32;
  using Address for address;

  bytes private constant PARAMS_SIGNATURE =
    "Params(uint256 externalId,uint256 expiresAt,bytes32 nonce,bytes32 extra,address receiver,address referrer)";
  bytes32 private constant PARAMS_TYPEHASH = keccak256(abi.encodePacked(PARAMS_SIGNATURE));

  bytes private constant ASSET_SIGNATURE = "Asset(uint256 tokenType,address token,uint256 tokenId,uint256 amount)";
  bytes32 private constant ASSET_TYPEHASH = keccak256(abi.encodePacked(ASSET_SIGNATURE));

  bytes32 private immutable ONE_TO_ONE_TYPEHASH =
    keccak256(
      bytes.concat("EIP712(address account,Params params,Asset item,Asset price)", ASSET_SIGNATURE, PARAMS_SIGNATURE)
    );
  bytes32 private immutable ONE_TO_MANY_TYPEHASH =
    keccak256(
      bytes.concat("EIP712(address account,Params params,Asset item,Asset[] price)", ASSET_SIGNATURE, PARAMS_SIGNATURE)
    );
  bytes32 private immutable MANY_TO_MANY_TYPEHASH =
    keccak256(
      bytes.concat(
        "EIP712(address account,Params params,Asset[] items,Asset[] price)",
        ASSET_SIGNATURE,
        PARAMS_SIGNATURE
      )
    );
  bytes32 private immutable ONE_TO_MANY_TO_MANY_TYPEHASH =
    keccak256(
      bytes.concat(
        "EIP712(address account,Params params,Asset item,Asset[] price,Asset[] content,bytes32 config)",
        ASSET_SIGNATURE,
        PARAMS_SIGNATURE
      )
    );

  constructor() EIP712() {}

  function _validateParams(Params memory params) internal {
    _validateNonce(params.nonce);
    _validateExpirationDate(params.expiresAt);
  }

  /**
   * @dev Prevents transaction replay
   *
   * @param nonce Unique identification of transaction
   */
  function _validateNonce(bytes32 nonce) internal {
    if (SigValStorage.layout()._expired[nonce]) {
      revert ExpiredSignature();
    }
    SigValStorage.layout()._expired[nonce] = true;
  }

  /**
   * @dev Prevents transaction replay
   *
   * @param expiresAt Expiration time
   */
  function _validateExpirationDate(uint256 expiresAt) internal view {
    if (expiresAt != 0) {
      if (block.timestamp > expiresAt) {
        revert ExpiredSignature();
      }
    }
  }

  function _recoverOneToOneSignature(
    Params memory params,
    Asset memory item,
    Asset memory price,
    bytes calldata signature
  ) internal view returns (address) {
    return _recoverSigner(_hashOneToOne(_msgSender(), params, item, price), signature);
  }

  function _recoverOneToManySignature(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) internal view returns (address) {
    return _recoverSigner(_hashOneToMany(_msgSender(), params, item, price), signature);
  }

  function _recoverManyToManySignature(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) internal view returns (address) {
    return _recoverSigner(_hashManyToMany(_msgSender(), params, items, price), signature);
  }

  function _recoverOneToManyToManySignature(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    Asset[] memory content,
    bytes32 config,
    bytes calldata signature
  ) internal view returns (address) {
    return _recoverSigner(_hashOneToManyToMany(_msgSender(), params, item, price, content, config), signature);
  }

  function _recoverSigner(bytes32 digest, bytes memory signature) private pure returns (address) {
    return digest.recover(signature);
  }

  function _hashOneToOne(
    address account,
    Params memory params,
    Asset memory item,
    Asset memory price
  ) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            ONE_TO_ONE_TYPEHASH,
            account,
            _hashParamsStruct(params),
            _hashAssetStruct(item),
            _hashAssetStruct(price)
          )
        )
      );
  }

  function _hashOneToMany(
    address account,
    Params memory params,
    Asset memory item,
    Asset[] memory price
  ) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            ONE_TO_MANY_TYPEHASH,
            account,
            _hashParamsStruct(params),
            _hashAssetStruct(item),
            _hashAssetStructArray(price)
          )
        )
      );
  }

  function _hashManyToMany(
    address account,
    Params memory params,
    Asset[] memory items,
    Asset[] memory price
  ) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            MANY_TO_MANY_TYPEHASH,
            account,
            _hashParamsStruct(params),
            _hashAssetStructArray(items),
            _hashAssetStructArray(price)
          )
        )
      );
  }

  function _hashOneToManyToMany(
    address account,
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    Asset[] memory content,
    bytes32 config
  ) private view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(
          abi.encode(
            ONE_TO_MANY_TO_MANY_TYPEHASH,
            account,
            _hashParamsStruct(params),
            _hashAssetStruct(item),
            _hashAssetStructArray(price),
            _hashAssetStructArray(content),
            config
          )
        )
      );
  }

  function _hashParamsStruct(Params memory params) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          PARAMS_TYPEHASH,
          params.externalId,
          params.expiresAt,
          params.nonce,
          params.extra,
          params.receiver,
          params.referrer
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
