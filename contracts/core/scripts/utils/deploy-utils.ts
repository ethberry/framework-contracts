import fs from "fs";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { blockAwait, blockAwaitMs, camelToSnakeCase } from "@gemunion/contracts-helpers";

export interface IObj {
  address?: string;
  hash?: string;
}

export const debug = async (obj: IObj | Record<string, Contract>, name?: string, delay = 1, delayMs = 300) => {
  if (obj?.hash) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/restrict-template-expressions
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
  for (const contract of contracts) {
    for (const account of grantee) {
      for (const role of roles) {
        if (contract !== account) {
          const accessInstance = await ethers.getContractAt("ERC721Simple", contract);
          console.info(`grantRole [${idx} of ${max}] ${contract} ${account}`);
          idx++;
          await blockAwaitMs(300);
          await accessInstance.grantRole(role, account);
          // await debug(await accessInstance.grantRole(roles[k], grantee[j]), "grantRole");
        }
      }
    }
  }
};
