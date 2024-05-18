// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { Context } from "@openzeppelin/contracts/utils/Context.sol";

import { Asset } from "../Exchange/lib/interfaces/IAsset.sol";

contract Referral is Context {
  event ReferralEvent(address indexed account, address indexed referrer, Asset[] price);

  function _afterPurchase(address referrer, Asset[] memory price) internal virtual {
    referralEvent(referrer, price);
  }

  function referralEvent(address initReferrer, Asset[] memory price) internal {
    if (initReferrer == address(0) || initReferrer == _msgSender()) {
      return;
    }

    emit ReferralEvent(_msgSender(), initReferrer, price);
  }
}
