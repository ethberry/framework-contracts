// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


library CMStorage {
    struct Layout {
        EnumerableSet.AddressSet _minters;
        EnumerableSet.AddressSet _manipulators;
    }

    bytes32 internal constant STORAGE_SLOT =
        keccak256('cm.contracts.storage');

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
