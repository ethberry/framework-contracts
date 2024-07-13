// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun+gemunion@gmail.com
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { CoinWallet } from "@gemunion/contracts-mocks/contracts/Wallet.sol";

import { IERC721Wrapper } from "../Mechanics/Wrapper/interfaces/IERC721Wrapper.sol";
import { TopUp } from "../utils/TopUp.sol";

contract TopUpMock is CoinWallet, TopUp {
	/**
	 * @notice No tipping!
   * @dev Rejects any incoming ETH transfers
   */
	receive() external payable override {
		revert();
	}
}
