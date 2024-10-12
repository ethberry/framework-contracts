// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl, IAccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

import { MINTER_ROLE, DEFAULT_ADMIN_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { AbstractFactoryFacet } from "./AbstractFactoryFacet.sol";

contract ERC20FactoryFacet is AbstractFactoryFacet, SignatureValidatorCM {
  constructor() SignatureValidatorCM() {}

  bytes private constant ERC20_ARGUMENTS_SIGNATURE =
    "Erc20Args(string name,string symbol,uint256 cap,string contractTemplate)";
  bytes32 private constant ERC20_ARGUMENTS_TYPEHASH = keccak256(ERC20_ARGUMENTS_SIGNATURE);

  bytes32 private immutable ERC20_PERMIT_SIGNATURE =
    keccak256(bytes.concat("EIP712(Params params,Erc20Args args)", ERC20_ARGUMENTS_SIGNATURE, PARAMS_SIGNATURE));

  struct Erc20Args {
    string name;
    string symbol;
    uint256 cap;
    string contractTemplate;
  }

  event ERC20TokenDeployed(address account, uint256 externalId, Erc20Args args);

  function deployERC20Token(
    Params calldata params,
    Erc20Args calldata args,
    bytes calldata signature
  ) external returns (address account) {
    _validateParams(params);

    address signer = _recoverSigner(_hashERC20(params, args), signature);
    if (!_hasRole(DEFAULT_ADMIN_ROLE, signer)) {
      revert SignerMissingRole();
    }

    bytes memory argument = abi.encode(args.name, args.symbol, args.cap);
    bytes memory bytecode = abi.encodePacked(params.bytecode, argument);
    account = Create2.computeAddress(params.nonce, keccak256(bytecode));
    emit ERC20TokenDeployed(account, params.externalId, args);
    Create2.deploy(0, params.nonce, bytecode);

    bytes32[] memory roles = new bytes32[](2);
    roles[0] = MINTER_ROLE;
    roles[1] = DEFAULT_ADMIN_ROLE;

    fixPermissions(account, roles);
  }

  function _hashERC20(Params calldata params, Erc20Args calldata args) internal view returns (bytes32) {
    return
      _hashTypedDataV4(
        keccak256(abi.encodePacked(ERC20_PERMIT_SIGNATURE, _hashParamsStruct(params), _hashErc20Struct(args)))
      );
  }

  function _hashErc20Struct(Erc20Args calldata args) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          ERC20_ARGUMENTS_TYPEHASH,
          keccak256(bytes(args.name)),
          keccak256(bytes(args.symbol)),
          args.cap,
          keccak256(bytes(args.contractTemplate))
        )
      );
  }
}
