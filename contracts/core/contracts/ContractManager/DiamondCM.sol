// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Diamond } from "../Diamond/Diamond.sol";
import { LibDiamond } from "../Diamond/lib/LibDiamond.sol";
import { AccessControlInternal } from "../Diamond/override/AccessControlInternal.sol";

/**
 * todo create contract WalletDiamond. It have to be inherited by this contract.
 */
contract DiamondCM is Diamond, AccessControlInternal {
  constructor(address _contractOwner, address _diamondCutFacet) payable Diamond(_contractOwner, _diamondCutFacet) {
    // Can initialise some storage values here if needed.
  }
}
//creat2 contract
contract Deployer {
    event Deployed(address addr);

    function deploy(bytes32 salt, address _contractOwner, address _diamondCutFacet) public {
        address addr;
        bytes memory bytecode = abi.encodePacked(
            type(DiamondCM).creationCode,
            abi.encode(_contractOwner, _diamondCutFacet)
        );

        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        emit Deployed(addr);
    }

    function getAddress(bytes32 salt, address _contractOwner, address _diamondCutFacet) public view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(DiamondCM).creationCode,
            abi.encode(_contractOwner, _diamondCutFacet)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }
}
