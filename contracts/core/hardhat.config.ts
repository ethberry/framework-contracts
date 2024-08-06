import { config } from "dotenv";
import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-web3";
import "hardhat-contract-sizer";

import "./tasks";

const BSC_PRIVATE_KEY = vars.get("BSC_PRIVATE_KEY");

const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

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
    testnet: {
      name: "testnet",
      chainId: 97,
      url: `https://data-seed-prebsc-1-s1.bnbchain.org:8545`,
      accounts: [BSC_PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.4.18",
      },
      {
        version: "0.5.16",
      },
      {
        version: "0.8.20",
      },
      {
        version: "0.7.6",
      },
      {
        version: "0.8.22",
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
      bscTestnet: ETHERSCAN_API_KEY,
      bsc: process.env.ETHERSCAN_API_KEY,
    },
  },
} as HardhatUserConfig;
