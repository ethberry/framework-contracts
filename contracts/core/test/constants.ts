import { toUtf8Bytes, WeiPerEther, ZeroAddress, ZeroHash, zeroPadValue } from "ethers";

import { nonce } from "@gemunion/contracts-constants";

import { getNumbers } from "./utils";

export const wallets = [
  "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
  "0x627306090abab3a6e1400e9345bc60c78a8bef57",
  "0xf17f52151ebef6c7334fad080c5704d77216b732",
];
export const wallet = wallets[0];

export enum TokenMetadata {
  TEMPLATE_ID = "TEMPLATE_ID",
  LEVEL = "LEVEL",
  RARITY = "RARITY",
  TRAITS = "TRAITS",
  GENES = "GENES",
  ROUND = "ROUND",
  NUMBERS = "NUMBERS",
  PRIZE = "PRIZE",
}

export enum NodeEnv {
  test = "test",
  development = "development",
  staging = "staging",
  production = "production",
}

export const tokenId = 1n;
export const tokenIds = [1];
export const tokenIdsZero = [0];
export const templateId = 1n;
export const templateIds = [1n];
export const cap = WeiPerEther * 1000000000n;
export const userId = 1;
export const claimId = 1;

export const amountWei = 10000000000000000n;
export const tokenZero = "0x0000000000000000000000000000000000000000";
export const period = 60 * 60 * 24 * 365; // a year in seconds
export const _stakePeriod = 300; // 5 minutes in seconds

export const defaultNumbers = getNumbers();
export const span = 300;
export const maxStake = 5;

// EXCHANGE
export const externalId = 1;
export const expiresAt = 0;
export const extra = ZeroHash;

export const params = {
  externalId,
  expiresAt,
  nonce,
  extra,
  referrer: ZeroAddress,
  receiver: ZeroAddress,
};

export const contractTemplate = "SIMPLE";

// toUtf8String(stripZerosLeft(tokenAttribute))
export const tokenAttributes = {
  PRIZE: zeroPadValue(toUtf8Bytes(TokenMetadata.PRIZE), 32),
  ROUND: zeroPadValue(toUtf8Bytes(TokenMetadata.ROUND), 32),
  NUMBERS: zeroPadValue(toUtf8Bytes(TokenMetadata.NUMBERS), 32),
  LEVEL: zeroPadValue(toUtf8Bytes(TokenMetadata.LEVEL), 32),
  RARITY: zeroPadValue(toUtf8Bytes(TokenMetadata.RARITY), 32),
  GENES: zeroPadValue(toUtf8Bytes(TokenMetadata.GENES), 32),
  TRAITS: zeroPadValue(toUtf8Bytes(TokenMetadata.TRAITS), 32),
  TEMPLATE_ID: zeroPadValue(toUtf8Bytes(TokenMetadata.TEMPLATE_ID), 32),
};

export const subscriptionId = 1;

export enum FrameworkInterfaceId {
  ERC721Simple = "0xbf290e49",
  ERC721Upgradable = "0x45977d03",
  ERC721Random = "0x32034d27",
  ERC721Mystery = "0xf0f47261",
  Dispenser = "0x1f120210",
}
