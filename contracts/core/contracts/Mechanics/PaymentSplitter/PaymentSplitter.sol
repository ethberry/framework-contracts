// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import { CoinWallet, NativeWallet } from "@gemunion/contracts-mocks/contracts/Wallet.sol";
import { PaymentSplitter } from "@gemunion/contracts-utils/contracts/PaymentSplitter.sol";

contract GemunionSplitter is PaymentSplitter, CoinWallet {
  constructor(address[] memory payees, uint256[] memory shares) PaymentSplitter (payees, shares) { }

  receive() external payable override(PaymentSplitter, NativeWallet) {
    emit PaymentReceived(_msgSender(), msg.value);
  }
}
