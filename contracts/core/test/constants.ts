import { toUtf8Bytes, WeiPerEther, ZeroAddress, ZeroHash, zeroPadValue } from "ethers";

import { nonce } from "@gemunion/contracts-constants";

import { TokenMetadata } from "./types";

export const motherGenes = 107914390657248203931494128369229995047683281774584692748922102830935711579232n;
export const fatherGenes = 70681664159614147522986300818112080314741133087508264051542039665822922212221n;

export const tokenId = 1n;
export const tokenIds = [1];
export const tokenIdsZero = [0];
export const templateId = 1n;
export const templateIds = [1n];
export const cap = WeiPerEther * 1000000000n;
export const userId = 1;
export const claimId = 1;
export const batchSize = 10n;

export const amountWei = 10000000000000000n;
export const tokenZero = "0x0000000000000000000000000000000000000000";
export const period = 60 * 60 * 24 * 365; // a year in seconds

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

export enum FrameworkInterfaceId {
  ERC721Simple = "0xbf290e49",
  ERC721Random = "0x32034d27",
  ERC721Genes = "0x06cc81f2",
  ERC721Mystery = "0xf0f47261",
  ERC721Loot = "0x3d97437a",
  IERC721Discrete = "0x1b7abe93",
  Dispenser = "0x1f120210",
}
