// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AccessControl, IAccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";
import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import { MINTER_ROLE, METADATA_ROLE } from "@ethberry/contracts-utils/contracts/roles.sol";

import { AccessControlInternal } from "../../Diamond/override/AccessControlInternal.sol";
import { SignatureValidatorCM } from "../override/SignatureValidator.sol";
import { CMStorage } from "../storage/CMStorage.sol";

/**
 * @title AbstractFactory
 * @dev Utility contract provides common functionality for deployment other contracts (tokens)
 */
abstract contract AbstractFactoryFacet is AccessControlInternal {
  using EnumerableSet for EnumerableSet.AddressSet;

  /**
   * @dev Deploys a contract using `create2` optcode.
   *
   * @param bytecode The bytecode to deploy.
   * @param arguments The constructor arguments for the contract.
   * @param nonce A random value to ensure the deployed address is unique.
   * @return addr The address of the deployed contract.
   */
  function deploy2(bytes calldata bytecode, bytes memory arguments, bytes32 nonce) internal returns (address addr) {
    // Combine `bytecode` and `arguments` into a single `bytes` array.
    bytes memory _bytecode = abi.encodePacked(bytecode, arguments);

    // Deploy the contract using `create2`
    // The deployed address will be deterministic based on `nonce` and the hash of `_bytecode`.
    return Create2.deploy(0, nonce, _bytecode);
  }

  /**
   * @dev Grants MINTER_ROLE to factories
   *
   * @param addr Address of the factory
   */
  function grantFactoryMintPermission(address addr) internal {
    // Create an instance of the contract that supports the AccessControl interface.
    IAccessControl instance = IAccessControl(addr);
    // Grant MINTER_ROLE to all _minters
    uint256 length = EnumerableSet.length(CMStorage.layout()._minters);
    for (uint256 i = 0; i < length; ) {
      instance.grantRole(MINTER_ROLE, EnumerableSet.at(CMStorage.layout()._minters, i));
      unchecked {
        i++;
      }
    }
  }

  /**
   * @dev Grants METADATA_ROLE to contracts that can update token's metadata
   *
   * @param addr Address of the factory that support IAccessControl
   */
  function grantFactoryMetadataPermission(address addr) internal {
    // Create an instance of the contract that supports the AccessControl interface.
    IAccessControl instance = IAccessControl(addr);
    // Grant METADATA_ROLE to all _manipulators
    uint256 length = EnumerableSet.length(CMStorage.layout()._manipulators);
    for (uint256 i = 0; i < length; ) {
      instance.grantRole(METADATA_ROLE, EnumerableSet.at(CMStorage.layout()._manipulators, i));
      unchecked {
        i++;
      }
    }
  }

  /**
   * @dev Grants the specified roles to the deployer of the contract.
   *
   * @param addr The address of the contract to modify permissions for.
   * @param roles An array of role IDs to modify permissions for.
   */
  function fixPermissions(address addr, bytes32[] memory roles) internal {
    // Create an instance of the contract that supports the AccessControl interface.
    IAccessControl instance = IAccessControl(addr);

    uint256 length = roles.length;
    for (uint256 i = 0; i < length; ) {
      // Grant the specified roles to the caller of the function.
      instance.grantRole(roles[i], _msgSender());
      // Renounce the specified roles from the ContractManager contract.
      instance.renounceRole(roles[i], address(this));
      unchecked {
        i++;
      }
    }
  }
}
