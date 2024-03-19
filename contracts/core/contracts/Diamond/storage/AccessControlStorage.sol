// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (access/AccessControl.sol)

pragma solidity ^0.8.0;

struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}

library ACStorage {
    struct Layout {
        mapping(bytes32 => RoleData) _roles;
    }

    bytes32 internal constant STORAGE_SLOT = 
        keccak256('access-control.contracts.storage.AC');

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}