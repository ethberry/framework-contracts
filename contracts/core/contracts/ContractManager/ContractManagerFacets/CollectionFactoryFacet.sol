// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.13;

import { MINTER_ROLE, DEFAULT_ADMIN_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

contract CollectionFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant ERC721C_ARGUMENTS_SIGNATURE =
    "CollectionArgs(string name,string symbol,uint96 royalty,string baseTokenURI,uint96 batchSize,string contractTemplate)";
  bytes32 private constant ERC721C_ARGUMENTS_TYPEHASH = keccak256(ERC721C_ARGUMENTS_SIGNATURE);

  bytes32 private immutable ERC721C_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,CollectionArgs args)", ERC721C_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct CollectionArgs {
    string name;
    string symbol;
    uint96 royalty;
    string baseTokenURI;
    uint96 batchSize;
    string contractTemplate;
  }

  event CollectionDeployed(address account, uint256 externalId, CollectionArgs args);

  function deployCollection(
    Params calldata params,
    CollectionArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _validateParams(params);

    address signer = _recoverSigner(_hashCollection(params, args), signature);
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(
      params.bytecode,
      abi.encode(args.name, args.symbol, args.royalty, args.baseTokenURI, args.batchSize, _msgSender()),
      params.nonce
    );

    emit CollectionDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = MINTER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    grantFactoryMetadataPermission(account);
    fixPermissions(account, roles);
  }

  function _hashCollection(Params calldata params, CollectionArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(ERC721C_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashCollectionCStruct(args)))
      );
  }

  function _hashCollectionCStruct(CollectionArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          ERC721C_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.name)),
          keccak256(bytes(args.symbol)),
          args.royalty,
          keccak256(bytes(args.baseTokenURI)),
          args.batchSize,
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
