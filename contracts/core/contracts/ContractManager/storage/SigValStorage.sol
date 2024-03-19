// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

library SigValStorage {
    struct Layout {
        mapping(bytes32 => bool) _expired;
    }

    bytes32 internal constant STORAGE_SLOT =
        keccak256('signature-validator.contracts.storage');

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
