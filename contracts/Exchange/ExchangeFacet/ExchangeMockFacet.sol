// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { DiamondOverride } from "../../Diamond/override/DiamondOverride.sol";
import { ExchangeUtils } from "../../Exchange/lib/ExchangeUtils.sol";
import { SignatureValidator } from "../override/SignatureValidator.sol";
import { Asset, AllowedTokenTypes } from "../lib/interfaces/IAsset.sol";
import { TopUp } from "../../utils/TopUp.sol";

contract ExchangeMockFacet is SignatureValidator, DiamondOverride, TopUp {
  constructor() SignatureValidator() {}

  function testSpendFrom(
    Asset[] memory price,
    address spender,
    address receiver,
    AllowedTokenTypes memory allowed
  ) external payable {
    // Transfer tokens to self or other address
    ExchangeUtils.spendFrom(price, spender, receiver, allowed);
  }

  function testBurnFrom(Asset[] memory price, address spender, AllowedTokenTypes memory allowed) external payable {
    // Burn tokens
    ExchangeUtils.burnFrom(price, spender, allowed);
  }

  function testSpend(Asset[] memory price, address receiver, AllowedTokenTypes memory allowed) external payable {
    // Spender is always this contract
    ExchangeUtils.spend(price, receiver, allowed);
  }

  function testAcquire(Asset[] memory price, address receiver, AllowedTokenTypes memory allowed) external payable {
    // Mint new tokens for receiver
    ExchangeUtils.acquire(price, receiver, allowed);
  }

  function testAcquireFrom(Asset[] memory price, address receiver, AllowedTokenTypes memory allowed) external payable {
    // Mint new tokens for receiver & transferFrom NATIVE & ERC20
    ExchangeUtils.acquireFrom(price, _msgSender(), receiver, allowed);
  }
}
