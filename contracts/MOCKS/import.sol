// SPDX-License-Identifier: UNLICENSED

// Author: TrejGun
// Email: trejgun@gmail.com
// Website: https://ethberry.io/

pragma solidity ^0.8.20;

import { AllTypesHolderMock, NftHolderMock, CoinHolderMock, NativeRejectorMock, NativeReceiverMock } from "@ethberry/contracts-finance/contracts/HolderMocks.sol";

import { VRFCoordinatorV2PlusMock } from "@ethberry/contracts-chain-link-v2-plus/contracts/mocks/VRFCoordinatorV2Plus.sol";

import { ERC998ERC721ABERS } from "@ethberry/contracts-erc998td/contracts/preset/ERC998ERC721ABERS.sol";
import { ERC721ABEC } from "@ethberry/contracts-erc721e/contracts/preset/ERC721ABEC.sol";
import { ERC20ABC } from "@ethberry/contracts-erc20/contracts/preset/ERC20ABC.sol";

import { ERC20Mock } from "@ethberry/contracts-mocks/contracts/ERC20Mock.sol";
import { ERC721Mock } from "@ethberry/contracts-mocks/contracts/ERC721Mock.sol";
import { ERC1155Mock } from "@ethberry/contracts-mocks/contracts/ERC1155Mock.sol";
import { ERC1363Mock } from "@ethberry/contracts-mocks/contracts/ERC1363Mock.sol";
