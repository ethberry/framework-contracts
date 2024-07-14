// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gemunion.io
// Website: https://gemunion.io/

pragma solidity ^0.8.20;

import { AllTypesHolder, NftHolder, CoinHolder, NativeRejector, NativeReceiver } from "@gemunion/contracts-finance/contracts/Holder.sol";

import { VRFCoordinatorV2Mock } from "@gemunion/contracts-chain-link-v2/contracts/mocks/VRFCoordinatorV2.sol";

import { ERC998ERC721ABERS } from "@gemunion/contracts-erc998td/contracts/preset/ERC998ERC721ABERS.sol";
import { ERC721ABEC } from "@gemunion/contracts-erc721e/contracts/preset/ERC721ABEC.sol";
import { ERC20ABC } from "@gemunion/contracts-erc20/contracts/preset/ERC20ABC.sol";
import { PaymentSplitter } from "@gemunion/contracts-finance/contracts/PaymentSplitter.sol";

import { ERC20Mock } from "@gemunion/contracts-mocks/contracts/ERC20Mock.sol";
import { ERC721Mock } from "@gemunion/contracts-mocks/contracts/ERC721Mock.sol";
import { ERC1155Mock } from "@gemunion/contracts-mocks/contracts/ERC1155Mock.sol";
import { ERC1363Mock } from "@gemunion/contracts-mocks/contracts/ERC1363Mock.sol";
