// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {MINTER_ROLE, DEFAULT_ADMIN_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {SignerMissingRole} from "../../utils/errors.sol";
import {SignatureValidatorCM} from "../override/SignatureValidator.sol";
import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

contract ERC721FactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant ERC721_ARGUMENTS_SIGNATURE =
    "Erc721Args(string name,string symbol,uint96 royalty,string baseTokenURI,string contractTemplate)";
  bytes32 private constant ERC721_ARGUMENTS_TYPEHASH = keccak256(ERC721_ARGUMENTS_SIGNATURE);

  bytes32 private immutable ERC721_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,Erc721Args args)", ERC721_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct Erc721Args {
    string name;
    string symbol;
    uint96 royalty;
    string baseTokenURI;
    string contractTemplate;
  }

  event ERC721TokenDeployed(address account, uint256 externalId, Erc721Args args);

  function deployERC721Token(
    Params calldata params,
    Erc721Args calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashERC721(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(
      params.bytecode,
      abi.encode(args.name, args.symbol, args.royalty, args.baseTokenURI),
      params.nonce
    );

    emit ERC721TokenDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = MINTER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    grantFactoryMetadataPermission(account);
    fixPermissions(account, roles);
  }

  function _hashERC721(Params calldata params, Erc721Args calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(ERC721_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashErc721Struct(args)))
      );
  }

  function _hashErc721Struct(Erc721Args calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          ERC721_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.name)),
          keccak256(bytes(args.symbol)),
          args.royalty,
          keccak256(bytes(args.baseTokenURI)),
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
