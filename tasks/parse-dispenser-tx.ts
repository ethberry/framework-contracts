import { task } from "hardhat/config";
import { Interface, TransactionReceipt, TransactionResponse } from "ethers";

const Dispenser = {
  abi: [
    {
      inputs: [
        {
          components: [
            {
              internalType: "enum TokenType",
              name: "tokenType",
              type: "uint8",
            },
            {
              internalType: "address",
              name: "token",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "tokenId",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
          ],
          internalType: "struct Asset[]",
          name: "items",
          type: "tuple[]",
        },
        {
          internalType: "address[]",
          name: "receivers",
          type: "address[]",
        },
      ],
      name: "disperse",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ],
};

const ERC20 = {
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
  ],
};

const ERC721 = {
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "tokenId",
          type: "uint256",
        },
      ],
      name: "Transfer",
      type: "event",
    },
  ],
};

const ERC1155 = {
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256[]",
          name: "ids",
          type: "uint256[]",
        },
        {
          indexed: false,
          internalType: "uint256[]",
          name: "values",
          type: "uint256[]",
        },
      ],
      name: "TransferBatch",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "from",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "to",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "TransferSingle",
      type: "event",
    },
  ],
};

export function getDispenserLogsFromInput(tx: TransactionResponse | null) {
  if (!tx) {
    return null;
  }
  // Get the provider and the transaction receipt

  // Retrieve the contract interface
  const iface = new Interface(Dispenser.abi);

  // Parse the input data of the transaction to determine the disperse function used
  // parseTransaction(tx: { data: string, value?: BigNumberish }): null | TransactionDescription {
  // const inputData = tx.data;
  const txDescription = iface.parseTransaction({ data: tx.data, value: tx.value.toString() });

  if (!txDescription) {
    throw new Error("parseTransaction returns null");
  }

  const { name, args } = txDescription;

  // Create a list of logs based on the disperse function used
  const recipients = args.recipients;
  const tokenIds = args.tokenIds;
  const amounts = args.amounts;
  let logs: Array<any>;
  let eventName = "";
  switch (name) {
    case "disperseEther":
      eventName = "TransferETH";
      logs = recipients.map((recipient: any, i: number): [string, number] => [recipient, amounts[i]]);
      break;
    case "disperseERC20":
      eventName = "Transfer";
      logs = recipients.map((recipient: any, i: number): [string, string, number] => [tx.to!, recipient, amounts[i]]);
      break;
    case "disperseERC721":
      eventName = "Transfer";
      logs = recipients.map((recipient: any, i: number): [string, string, number] => [tx.from, recipient, tokenIds[i]]);
      break;
    case "disperseERC1155":
      eventName = "TransferSingle";
      logs = recipients.map((recipient: any, i: number): [string, string, string, number, number] => [
        tx.to!, // Operator
        tx.from, // msg.sender
        recipient, // receiver
        tokenIds[i],
        amounts[i],
      ]);
      break;
    default:
      throw new Error(`Unrecognized function name: ${name}`);
  }
  return { functionName: name, eventName, logs };
}

function compareTwoLogs(args: Array<any>, receiptArgs: Array<any>) {
  for (let i = 0; i < args.length; i++) {
    if (receiptArgs[i] !== args[i]) {
      // If values are not equal
      return false;
    }
  }
  // all values are equal
  return true;
}

export function compareLogs(
  receipt: TransactionReceipt,
  functionName: string,
  eventName: string,
  logs: Array<Array<any>>,
): { findLogs: Array<any>; dontFindLogs: Array<any> } {
  if (!receipt.status) {
    // receipt
    throw new Error("Transaction was reverted");
  }

  let iface: Interface;
  switch (functionName) {
    case "disperseEther":
      iface = new Interface(Dispenser.abi);
      break;
    case "disperseERC20":
      iface = new Interface(ERC20.abi);
      break;
    case "disperseERC721":
      iface = new Interface(ERC721.abi);
      break;
    case "disperseERC1155":
      iface = new Interface(ERC1155.abi);
      break;
    default:
      throw new Error(`Unrecognized function name ${functionName}`);
  }

  // Parse the logs and check transfer status
  const findLogs = [];
  const dontFindLogs = [];

  // Go through all logs, that we want to check transfer Status.
  for (const log of logs) {
    const find = receipt.logs.find(_log => {
      const logDescription = iface.parseLog({ topics: _log.topics as string[], data: _log.data });
      if (!logDescription) {
        return false;
      }
      const { name, args } = logDescription;
      if (name === eventName && log.length === args.length && Array.isArray(args)) {
        if (compareTwoLogs(log, args)) {
          return true; // find Log.
        }
      }
      return false;
    });

    if (find) {
      findLogs.push(log);
    } else {
      dontFindLogs.push(log);
    }
  }

  // Print the list of transfers and their status
  return { findLogs, dontFindLogs };
}

task("parse-dispenser-tx", "Prints success transfers and failed transfers")
  .addParam("hash", "The transaction hash")
  .setAction(async (args, hre) => {
    const { hash } = args;

    // Parse tx Input
    const tx = await hre.ethers.provider.getTransaction(hash);
    const log = getDispenserLogsFromInput(tx);
    if (!log) {
      console.error("LOGS NOT PARSED");
      return null;
    }
    const { functionName, eventName, logs } = log;

    // Check success transfers
    const receipt = await hre.ethers.provider.getTransactionReceipt(hash);
    if (!receipt) {
      console.error("CAN'T GET RECEIPT");
      return null;
    }
    const { findLogs, dontFindLogs } = compareLogs(receipt, functionName, eventName, logs);

    console.info("FIND LOGS ::: \n", findLogs);
    console.warn("DONT FIND LOGS ::: \n", dontFindLogs);
    return null;
  });
