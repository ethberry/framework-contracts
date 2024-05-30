// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";

import { PAUSER_ROLE } from "@gemunion/contracts-utils/contracts/roles.sol";
import { Wallet } from "@gemunion/contracts-mocks/contracts/Wallet.sol";
import { PaymentSplitter } from "@gemunion/contracts-utils/contracts/PaymentSplitter.sol";

import { TopUp } from "../../utils/TopUp.sol";

contract Prediction is AccessControl, Pausable, TopUp, Wallet, PaymentSplitter {
  constructor(address[] memory payees, uint256[] memory shares) PaymentSplitter(payees, shares) {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(PAUSER_ROLE, _msgSender());
  }

  /**
   * @notice No tipping!
   * @dev Rejects any incoming ETH transfers
   */
  receive() external payable override(Wallet, TopUp, PaymentSplitter) {
    revert();
  }

  // PAUSE
  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function pause() public onlyRole(PAUSER_ROLE) {
    _pause();
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function unpause() public onlyRole(PAUSER_ROLE) {
    _unpause();
  }

  /**
   * @dev See {IERC165-supportsInterface}.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(AccessControl, TopUp, Wallet) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
