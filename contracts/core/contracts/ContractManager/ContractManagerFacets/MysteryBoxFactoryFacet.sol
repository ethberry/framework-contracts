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

contract MysteryBoxFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant MYSTERYBOX_ARGUMENTS_SIGNATURE =
    "MysteryArgs(string name,string symbol,uint96 royalty,string baseTokenURI,string contractTemplate)";
  bytes32 private constant MYSTERYBOX_ARGUMENTS_TYPEHASH = keccak256(MYSTERYBOX_ARGUMENTS_SIGNATURE);

  bytes32 private immutable MYSTERYBOX_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,MysteryArgs args)", MYSTERYBOX_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct MysteryArgs {
    string name;
    string symbol;
    uint96 royalty;
    string baseTokenURI;
    string contractTemplate;
  }

  event MysteryBoxDeployed(address account, uint256 externalId, MysteryArgs args);

  function deployMysterybox(
    Params calldata params,
    MysteryArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashMysterybox(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(
      params.bytecode,
      abi.encode(args.name, args.symbol, args.royalty, args.baseTokenURI),
      params.nonce
    );

    emit MysteryBoxDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](3);
    roles[0] = MINTER_ROLE;
    roles[1] = PAUSER_ROLE;
    roles[2] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    grantFactoryMetadataPermission(account);
    fixPermissions(account, roles);
    EnumerableSet.add(CMStorage.layout()._minters, account);
  }

  function _hashMysterybox(Params calldata params, MysteryArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(MYSTERYBOX_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashMysteryStruct(args)))
      );
  }

  function _hashMysteryStruct(MysteryArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          MYSTERYBOX_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.name)),
          keccak256(bytes(args.symbol)),
          args.royalty,
          keccak256(bytes(args.baseTokenURI)),
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
