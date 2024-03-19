// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {MINTER_ROLE, DEFAULT_ADMIN_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {SignerMissingRole} from "../../utils/errors.sol";
import {SignatureValidatorCM} from "../override/SignatureValidator.sol";
import {AbstractFactoryFacet} from "./AbstractFactoryFacet.sol";

contract ERC1155FactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant ERC1155_ARGUMENTS_SIGNATURE =
    "Erc1155Args(uint96 royalty,string baseTokenURI,string contractTemplate)";
  bytes32 private constant ERC1155_ARGUMENTS_TYPEHASH = keccak256(ERC1155_ARGUMENTS_SIGNATURE);

  bytes32 private immutable ERC1155_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,Erc1155Args args)", ERC1155_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct Erc1155Args {
    uint96 royalty;
    string baseTokenURI;
    string contractTemplate;
  }

  event ERC1155TokenDeployed(address account, uint256 externalId, Erc1155Args args);

  function deployERC1155Token(
    Params calldata params,
    Erc1155Args calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _checkNonce(params.nonce);

    address signer = _recoverSigner(_hashERC1155(params, args), signature);

    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    account = deploy2(params.bytecode, abi.encode(args.royalty, args.baseTokenURI), params.nonce);

    emit ERC1155TokenDeployed(account, params.externalId, args);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = MINTER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    grantFactoryMintPermission(account);
    fixPermissions(account, roles);
  }

  function _hashERC1155(Params calldata params, Erc1155Args calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(ERC1155_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashErc1155Struct(args)))
      );
  }

  function _hashErc1155Struct(Erc1155Args calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          ERC1155_ARGUMENTS_TYPEHASH,
          args.royalty,
          keccak256(bytes(args.baseTokenURI)),
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
