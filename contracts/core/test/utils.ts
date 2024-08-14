import { snakeToCamelCase } from "@gemunion/utils";
import { AbiCoder, concat, id, keccak256, Provider, Result, toBeArray, toBeHex, zeroPadValue } from "ethers";

// Patch BigNumber
// https://github.com/GoogleChromeLabs/jsbi/issues/30
// eslint-disable-next-line no-extend-native
Object.defineProperty(BigInt.prototype, "toJSON", {
  value: function () {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.toString();
  },
  configurable: true,
  enumerable: false,
  writable: true,
});

export const getNumbersBytes = (selected = [8, 5, 3, 2, 1, 0]) => {
  const numbers: Array<any> = [];
  selected.forEach(s => {
    numbers.push(toBeHex(s));
  });
  return zeroPadValue(concat(numbers), 32);
};

export const decodeNumbersBytes = (selected = "0x0000000000000000000000000000000000000000000000000000010203040506") => {
  const numbers: Array<number> = [];
  for (let i = 0; i < 6; i++) {
    numbers.push(Number(selected.substring(selected.length - 12, selected.length).substring(2 * i, 2 + 2 * i)));
  }
  return numbers;
};

export const getBytesNumbersArr = (selected = "4328719624n"): Array<number> => {
  const arrStr = toBeArray(selected);
  const arr = [];
  for (let i = 0; i < arrStr.length; i++) {
    arr.push(Number(arrStr[i]));
  }
  return arr;
};

export const getContractName = (base: string, network: string) => {
  return base.endsWith("Random") || base.endsWith("Genes") ? snakeToCamelCase(`${base}_${network}`) : base;
};

export const isEqualArray = (...args: any[]): any => {
  return (eventValues: any[]): boolean => {
    for (let i = 0; i < eventValues.length; i++) {
      if (JSON.stringify(eventValues[i]) !== JSON.stringify(args[i])) {
        console.error("eventValues[i]", JSON.stringify(eventValues[i]));
        console.error("args[i]", JSON.stringify(args[i]));
        return false;
      }
    }
    return true;
  };
};

export const isEqualEventArgObj = (args: any): any => {
  return (eventValues: any): boolean => {
    for (const key of Object.keys(args)) {
      if (JSON.stringify(eventValues[key]) !== JSON.stringify(args[key])) {
        return false;
      }
    }
    return true;
  };
};

export const isEqualEventArgArrObj = (...args: any[]): any => {
  return (eventValues: any[]): boolean => {
    for (let i = 0; i < eventValues.length; i++) {
      for (const key of Object.keys(args[i])) {
        if (JSON.stringify(eventValues[i][key]) !== JSON.stringify(args[i][key])) {
          console.error(`eventValues[${i}][${key}]`, JSON.stringify(eventValues[i][key]));
          console.error(`args[${i}][${key}]`, JSON.stringify(args[i][key]));
          return false;
        }
      }
    }
    return true;
  };
};

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
  } catch (err) {
    // Result is array.
    return result.toArray().map(item => recursivelyDecodeResult(item as Result));
  }
};

// solidity-create2-deployer/src/utils
// const encoded = AbiCoder.defaultAbiCoder().encode(abi, input);

export const encodeParam = (dataType: any, data: any) => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  return data && dataType ? abiCoder.encode([dataType], [data]) : "";
};

export const encodeParams = (dataTypes: any[], data: any[]) => {
  const abiCoder = AbiCoder.defaultAbiCoder();
  return dataTypes.length > 0 && data.length > 0 ? abiCoder.encode(dataTypes, data) : "";
};

export const buildBytecode = (constructorTypes: any[], constructorArgs: any[], contractBytecode: string) =>
  `${contractBytecode}${encodeParams(constructorTypes, constructorArgs).slice(2)}`;

export const buildCreate2Address = (factory: string, saltHex: string, byteCode: string) => {
  return `0x${keccak256(
    `0x${["ff", factory, saltHex, keccak256(byteCode)].map(x => x.replace(/0x/, "")).join("")}`,
  ).slice(-40)}`.toLowerCase();
};

export const numberToUint256 = (value: number) => {
  const hex = value.toString(16);
  return `0x${"0".repeat(64 - hex.length)}${hex}`;
};

export const saltToHex = (salt: string | number) => id(salt.toString());

export const isContract = async (address: string, provider: Provider) => {
  const code = await provider.getCode(address);
  return code.slice(2).length > 0;
};
