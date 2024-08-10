import fs from "fs";
import { ethers } from "hardhat";
import { Contract, Result } from "ethers";
import { blockAwait, blockAwaitMs, camelToSnakeCase } from "@gemunion/contracts-helpers";

export interface IObj {
  address?: string;
  hash?: string;
}

export const recursivelyDecodeResult = (result: Result): Record<string, any> => {
  if (typeof result !== "object") {
    // Raw primitive value
    return result;
  }
  try {
    const obj = result.toObject();
    if (obj._) {
      throw new Error("Decode as array, not object");
    }
    Object.keys(obj).forEach(key => {
      obj[key] = recursivelyDecodeResult(obj[key]);
    });
    return obj;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // Result is array.
    return result.toArray().map(item => recursivelyDecodeResult(item as Result));
  }
};

export const debug = async (obj: IObj | Record<string, Contract>, name?: string, delay = 1, delayMs = 300) => {
  if (obj && obj.hash) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    console.info(`${name} tx: ${obj.hash}`);
    await blockAwaitMs(delayMs);
  } else {
    console.info(`${Object.keys(obj).pop()} deployed`);
    const contract = Object.values(obj).pop();
    await blockAwait(delay, delayMs);
    const address = await contract.getAddress();
    fs.appendFileSync(
      `${process.cwd()}/log.txt`,
      // `${camelToSnakeCase(Object.keys(obj).pop() || "none").toUpperCase()}_ADDR=${contract && contract.address ? contract.address.toLowerCase : "--"}\n`,
      `${camelToSnakeCase(Object.keys(obj).pop() || "none").toUpperCase()}_ADDR=${address.toLowerCase() || "--"}\n`,
    );
  }
};

export const grantRoles = async (contracts: Array<string>, grantee: Array<string>, roles: Array<string>) => {
  let idx = 1;
  const max = contracts.length * grantee.length * roles.length;
  for (let i = 0; i < contracts.length; i++) {
    for (let j = 0; j < grantee.length; j++) {
      for (let k = 0; k < roles.length; k++) {
        if (contracts[i] !== grantee[j]) {
          const accessInstance = await ethers.getContractAt("ERC721Simple", contracts[i]);
          console.info(`grantRole [${idx} of ${max}] ${contracts[i]} ${grantee[j]}`);
          idx++;
          await blockAwaitMs(300);
          await accessInstance.grantRole(roles[k], grantee[j]);
          // await debug(await accessInstance.grantRole(roles[k], grantee[j]), "grantRole");
        }
      }
    }
  }
};
