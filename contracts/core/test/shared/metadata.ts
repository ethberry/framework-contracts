import { toUtf8String, stripZerosLeft } from "ethers";
import { TokenMetadata } from "../constants";

export const metadataKeysArray = [TokenMetadata.TEMPLATE_ID, TokenMetadata.TRAITS];

export const decodeMetadata = function (tokenMetaData: Array<any>): Record<string, string> {
  return tokenMetaData.reduce(
    (memo: Record<string, string>, current: { key: string; value: string }) =>
      Object.assign(memo, {
        [toUtf8String(stripZerosLeft(current.key))]: current.value,
      }),
    {} as Record<string, string>,
  ) as Record<string, string>;
};
