// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

import {ExchangeUtils} from "../Exchange/lib/ExchangeUtils.sol";
import {BalanceExceed,LimitExceed,ZeroBalance,RefProgramSet} from "../utils/errors.sol";
import {Asset, Params, TokenType, DisabledTokenTypes} from "../Exchange/lib/interfaces/IAsset.sol";

abstract contract LinearReferral is Context, AccessControl {
  using SafeERC20 for IERC20;

  struct Ref {
    uint256 _refReward;
    uint256 _refDecrease;
    uint8 _maxRefs;
    bool init;
  }
  Ref public _refProgram;

  event ReferralProgram(Ref refProgram);
  event ReferralReward(
    address indexed account,
    address indexed referrer,
    uint8 level,
    address indexed token,
    uint256 amount
  );
  event ReferralWithdraw(address indexed account, address indexed token, uint256 amount);

  mapping(address => address) private _chain;
  mapping(address => mapping(address => uint256)) _rewardBalances;

  function setRefProgram(uint8 maxRefs, uint256 refReward, uint256 refDecrease) public onlyRole(DEFAULT_ADMIN_ROLE) {
    if (_refProgram.init) {
      revert RefProgramSet();
    }
    if (refReward >= 10000) {
      revert LimitExceed();
    }
    _refProgram = Ref(refReward, refDecrease, maxRefs, true);
    emit ReferralProgram(_refProgram);
  }

  function getRefProgram() public view returns (Ref memory) {
    return _refProgram;
  }

  function _afterPurchase(address referrer, Asset[] memory price) internal virtual {
    updateReferrers(referrer, price);
  }

  function updateReferrers(address initReferrer, Asset[] memory price) internal {
    if (initReferrer == address(0) || initReferrer == _msgSender()) {
      return;
    }

    _chain[_msgSender()] = initReferrer;

    Ref storage program = _refProgram;

    uint256 length = price.length;
    for (uint256 i = 0; i < length; ) {
      Asset memory ingredient = price[i];
      if (ingredient.tokenType == TokenType.NATIVE || ingredient.tokenType == TokenType.ERC20) {
        address referrer = initReferrer;

        for (uint8 level = 0; level < program._maxRefs; level++) {
          uint256 rewardAmount = ((ingredient.amount / 100) * (program._refReward / 100)) /
            program._refDecrease ** (level);
          _rewardBalances[referrer][ingredient.token] += rewardAmount;
          emit ReferralReward(_msgSender(), referrer, level, ingredient.token, rewardAmount);

          if (_chain[referrer] == address(0) || _chain[referrer] == _msgSender()) {
            level = program._maxRefs;
          }
          referrer = _chain[referrer];
        }
      }
      unchecked {
        i++;
      }
    }
  }

  function withdrawReward(address token) public {
    uint256 rewardAmount = _rewardBalances[_msgSender()][token];

    if (rewardAmount == 0) {
      revert ZeroBalance();
    }
    // Check contract balances
    if (token == address(0)) {
      if (address(this).balance < rewardAmount) {
        revert BalanceExceed();
      }
    } else {
      uint256 balanceErc20 = IERC20(token).balanceOf(address(this));
      if (balanceErc20 < rewardAmount) {
        revert BalanceExceed();
      }
    }

    // Create a new Asset object representing the reward (NATIVE or ERC20 only)
    Asset memory rewardItem = Asset(
      token == address(0) ? TokenType.NATIVE : TokenType.ERC20,
      token,
      0,
      rewardAmount
    );
    // Transfer the reward Asset to the receiver.
    ExchangeUtils.spend(ExchangeUtils._toArray(rewardItem), _msgSender(), DisabledTokenTypes(false, false, true, true, true));

    emit ReferralWithdraw(_msgSender(), token, rewardAmount);
  }

  function getBalance(address referral, address token) public view returns (uint256 balance) {
    return _rewardBalances[referral][token];
  }
}
