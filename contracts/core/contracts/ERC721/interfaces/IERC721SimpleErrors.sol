// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

interface IERC721SimpleErrors {
  /**
   * @dev used to disable mint, safeMint, mintCommon functions
	 */
  error MethodNotSupported();

  /**
   * @dev used to validate templateId in mint* functions
	 */
  error TemplateZero();

  /**
   * @dev protects system attributes TEMPLATE_ID, RARITY
	 */
  error ProtectedAttribute(bytes32 attribute);
}
