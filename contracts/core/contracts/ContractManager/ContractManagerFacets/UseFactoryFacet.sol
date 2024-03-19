// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {DEFAULT_ADMIN_ROLE, METADATA_ROLE, MINTER_ROLE} from "@gemunion/contracts-utils/contracts/roles.sol";

import {AccessControlInternal} from "../../Diamond/override/AccessControlInternal.sol";
import {CMStorage} from "../storage/CMStorage.sol";
import {WrongRole} from "../../utils/errors.sol";

/**
 * @title UseFactory
 * @dev Utility to add and remove contracts from factory
 */
contract UseFactoryFacet is AccessControlInternal {

  using EnumerableSet for EnumerableSet.AddressSet;

  /**
   * @dev Set the list of allowed factories for creating and manipulating tokens
   *
   * @param factory address representing the allowed token factory
   * @param role to assign
   */
  function addFactory(address factory, bytes32 role) public onlyRole(DEFAULT_ADMIN_ROLE) {
    // Add the factory address to the appropriate array
    if (role == MINTER_ROLE) {
      EnumerableSet.add(CMStorage.layout()._minters, factory);
    } else if (role == METADATA_ROLE) {
      EnumerableSet.add(CMStorage.layout()._manipulators, factory);
    } else if (role == DEFAULT_ADMIN_ROLE) {
      EnumerableSet.add(CMStorage.layout()._minters, factory);
      EnumerableSet.add(CMStorage.layout()._manipulators, factory);
    } else {
      revert WrongRole();
    }
  }

  /**
   * @notice Removes a factory address from the list of minters and manipulators.
   * @param factory The address of the factory to be removed.
   * @param role to be removed.
   */
  function removeFactory(address factory, bytes32 role) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (role == MINTER_ROLE) {
      EnumerableSet.remove(CMStorage.layout()._minters, factory);
    } else if (role == METADATA_ROLE) {
      EnumerableSet.remove(CMStorage.layout()._manipulators, factory);
    } else if (role == DEFAULT_ADMIN_ROLE) {
      EnumerableSet.remove(CMStorage.layout()._minters, factory);
      EnumerableSet.remove(CMStorage.layout()._manipulators, factory);
    } else {
      revert WrongRole();
    }
  }

  /**
   * @dev Get minters array
   */
  function getMinters() public view returns (address[] memory minters) {
    return EnumerableSet.values(CMStorage.layout()._minters);
  }

  /**
   * @dev Get manipulators array
   */
  function getManipulators() public view returns (address[] memory manipulators) {
    return EnumerableSet.values(CMStorage.layout()._manipulators);
  }
}
