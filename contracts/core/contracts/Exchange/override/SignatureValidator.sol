// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {EIP712} from "../../Diamond/override/EIP712Upgradable.sol";
import {Asset, Params} from "../lib/interfaces/IAsset.sol";
import {SigValStorage} from "../storage/SigValStorage.sol";
import {ExpiredSignature} from "../../utils/errors.sol";

contract SignatureValidator is EIP712, Context {
  using ECDSA for bytes32;
  using Address for address;

  //   mapping(bytes32 => bool) private _expired;

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

  // constructor(string memory name) EIP712(name, "1.0.0") {}
  constructor() EIP712() {}

  function _recoverOneToOneSignature(
    Params memory params,
    Asset memory item,
    Asset memory price,
    bytes calldata signature
  ) internal returns (address) {
    if (SigValStorage.layout()._expired[params.nonce]) {
      revert ExpiredSignature();
    }
    SigValStorage.layout()._expired[params.nonce] = true;

    if (params.expiresAt != 0) {
      if (block.timestamp > params.expiresAt) {
        revert ExpiredSignature();
      }
    }

    return _recoverSigner(_hashOneToOne(_msgSender(), params, item, price), signature);
  }

  function _recoverOneToManySignature(
    Params memory params,
    Asset memory item,
    Asset[] memory price,
    bytes calldata signature
  ) internal returns (address) {
    if (SigValStorage.layout()._expired[params.nonce]) {
      revert ExpiredSignature();
    }
    SigValStorage.layout()._expired[params.nonce] = true;

    if (params.expiresAt != 0) {
      if (block.timestamp > params.expiresAt) {
        revert ExpiredSignature();
      }
    }

    return _recoverSigner(_hashOneToMany(_msgSender(), params, item, price), signature);
  }

  function _recoverManyToManySignature(
    Params memory params,
    Asset[] memory items,
    Asset[] memory price,
    bytes calldata signature
  ) internal returns (address) {
    if (SigValStorage.layout()._expired[params.nonce]) {
      revert ExpiredSignature();
    }
    SigValStorage.layout()._expired[params.nonce] = true;

    if (params.expiresAt != 0) {
      if (block.timestamp > params.expiresAt) {
        revert ExpiredSignature();
      }
    }

    return _recoverSigner(_hashManyToMany(_msgSender(), params, items, price), signature);
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
