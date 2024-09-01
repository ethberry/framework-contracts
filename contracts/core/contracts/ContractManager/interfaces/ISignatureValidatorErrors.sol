// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.0;

interface ISignatureValidatorErrors {
	/**
	 * @dev used to indicate that server signature does match but signer is not authorised
	 */
	error SignerMissingRole();

	/**
   * @dev used to indicate that server signature has expired
	 */
	error ExpiredSignature();

}
