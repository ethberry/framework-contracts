// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { DiamondCM } from "../ContractManager/DiamondCM.sol";

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
