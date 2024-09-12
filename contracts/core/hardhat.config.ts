import { config } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";

import "./tasks";

config({
  path: `.env.${process.env.NODE_ENV || "development"}`,
});

export default {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      blockGasLimit: 40966424, // default: 3e7
      gas: "auto",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.4.11", // LINK
      },
      {
        version: "0.4.17", // USDT
      },
      {
        version: "0.4.18", // WETH
      },
      {
        version: "0.4.24", // USDC
      },
      {
        version: "0.5.16", // BUSD
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000, // DO NOT CHANGE
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.ETHERSCAN_API_KEY,
    },
  },
} as HardhatUserConfig;
