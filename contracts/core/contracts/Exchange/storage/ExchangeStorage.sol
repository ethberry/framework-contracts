// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

library ExchangeStorage {
    struct Pregnancy {
        uint64 time; // last breeding timestamp
        uint64 count; // breeds count
    }

    struct Layout {
        mapping(address /* item's contract */ => mapping(uint256 /* item's tokenId */ => Pregnancy)) _breeds;
        uint64 _pregnancyTimeLimit; // first pregnancy(cooldown) time
        uint64 _pregnancyCountLimit;
        uint64 _pregnancyMaxTime;
    }

    bytes32 internal constant STORAGE_SLOT =
        keccak256('exchange.contracts.storage');

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
