// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import "hardhat/console.sol";
// import {errors} from "../../utils/errors.sol";
// must include all errors here

contract ErrorsIdCalculator {
    error MethodNotSupported();
    error TemplateZero();
    error UnsupportedTokenType();

    error SignerMissingRole();
    error ExpiredSignature();
    error NotExist();
    error AlreadyExist();
    error NotAnOwner();
    error CountExceed();
    error LimitExceed();
    error BalanceExceed();
    error WrongAmount();
    error RefProgramSet();
    error WrongArrayLength();

    // CM
    error WrongRole();

    // random
    error ProtectedAttribute(bytes32 attribute);

    // staking
    error WrongToken();
    error WrongStake();
    error WrongRule();
    error Expired();
    error ZeroBalance();
    error NotComplete();
    error NotActive();

    // lottery, raffle
    error WrongRound();
    error WrongPrice();

    // waitlist
    error NotInList();
}
