// SPDX-License-Identifier: MIT

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { VestingWallet } from "@openzeppelin/contracts/finance/VestingWallet.sol";

import { TopUp } from "../../utils/TopUp.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { Asset,TokenType,DisabledTokenTypes } from "../../Exchange/lib/interfaces/IAsset.sol";

/**
 * @title Daily Vesting
 * @dev Basic preset of Vesting contract that includes the following extensions:
 *      - Ownable (OpenZeppelin)
 *      - VestingWallet (OpenZeppelin)
 *      - TopUp (Gemunion)
 *      This contract abstracts all common functions and is used as an foundation for other vesting contracts
 */
contract DailyVesting is VestingWallet, TopUp {
	using SafeCast for uint256;

  uint64 public constant _dayInSeconds = 86400; // The number of seconds in a day
  uint16 private immutable _cliffInDays; // The number of days before the cliff period ends
  uint16 private immutable _dailyRelease; // The amount of tokens that can be released daily

	constructor(
    address beneficiary,
		uint64 startTimestamp,
		uint16 cliffInDays,
		uint16 dailyRelease
	) VestingWallet(beneficiary, startTimestamp, (10000000 * _dayInSeconds) / dailyRelease) {
		_cliffInDays = cliffInDays;
		_dailyRelease = dailyRelease;
	}

	/**
	 * @dev Computes the vesting schedule based on the total allocation and the timestamp.
   * @param totalAllocation The total allocation of tokens for vesting
   * @param timestamp The timestamp for which the vesting schedule is computed
   * @return The vesting schedule for the given total allocation and timestamp
   */
	function _vestingSchedule(uint256 totalAllocation, uint64 timestamp) internal view override returns (uint256) {
    uint256 _start = start() + _cliffInDays * _dayInSeconds;
    uint256 period = timestamp > _start ? (timestamp - _start) / _dayInSeconds : 0;

		if (timestamp < _start) {
			return 0;
		} else if (timestamp > _start + duration()) {
			return totalAllocation;
		} else {
      return (totalAllocation * period * _dailyRelease) / 10000000;
		}
	}

	/**
   * @dev Allows to top-up the vesting contract with tokens (NATIVE and ERC20 only)
   * @param price An array of Asset representing the tokens to be transferred.
   */
	function topUp(Asset[] memory price) external payable override {
		ExchangeUtils.spendFrom(price, _msgSender(), address(this), DisabledTokenTypes(false, false, true, true, true));
	}

	/**
	 * @dev Restrict the contract to receive Ether (receive via topUp function only).
   */
	receive() external payable override(VestingWallet, TopUp) {
		revert();
	}

	/**
	 * @dev See {IERC165-supportsInterface}.
   */
	function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
		return super.supportsInterface(interfaceId);
	}
}
