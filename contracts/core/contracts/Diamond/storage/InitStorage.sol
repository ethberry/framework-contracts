// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (security/Pausable.sol)

pragma solidity ^0.8.0;

library InitialiseStorage {
    struct Layout {
        bool _initialised;
    }

    bytes32 internal constant STORAGE_SLOT = 
        keccak256('initialise.contracts.storage.init');

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}