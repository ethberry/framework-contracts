// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import { METADATA_ROLE, MINTER_ROLE, DEFAULT_ADMIN_ROLE, PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";

import { SignerMissingRole } from "../../utils/errors.sol";
import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { CMStorage } from "../storage/CMStorage.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

contract LootBoxFactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant LOOTBOX_ARGUMENTS_SIGNATURE =
    "LootArgs(string name,string symbol,uint96 royalty,string baseTokenURI,string contractTemplate)";
  bytes32 private constant LOOTBOX_ARGUMENTS_TYPEHASH = keccak256(LOOTBOX_ARGUMENTS_SIGNATURE);

  bytes32 private immutable LOOTBOX_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,LootArgs args)", LOOTBOX_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct LootArgs {
    string name;
    string symbol;
    uint96 royalty;
    string baseTokenURI;
    string contractTemplate;
  }

  event LootBoxDeployed(address account, uint256 externalId, LootArgs args);

  function deployLootBox(
    Params calldata params,
    LootArgs calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _validateParams(params);

    address signer = _recoverSigner(_hashLootBox(params, args), signature);
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(
      params.bytecode,
      abi.encode(args.name, args.symbol, args.royalty, args.baseTokenURI),
      params.nonce
    );

    emit LootBoxDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](4);
    roles[0] = MINTER_ROLE;
    roles[1] = PAUSER_ROLE;
    roles[2] = METADATA_ROLE;
    roles[3] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    grantFactoryMetadataPermission(account);
    fixPermissions(account, roles);
  }

  function _hashLootBox(Params calldata params, LootArgs calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(LOOTBOX_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashLootStruct(args)))
      );
  }

  function _hashLootStruct(LootArgs calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          LOOTBOX_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.name)),
          keccak256(bytes(args.symbol)),
          args.royalty,
          keccak256(bytes(args.baseTokenURI)),
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
