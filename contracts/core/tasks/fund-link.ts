import { task } from "hardhat/config";
import { toBeHex } from "ethers";

task("fund-link", "Funds a contract with LINK")
  .addParam("contract", "The address of the contract that requires LINK")
  .setAction(async (taskArgs, hre) => {
    const address = taskArgs.contract;
    const networkName = hre.network.name;
    console.info("Funding contract ", address, " on network ", networkName);
    const LINK_TOKEN_ABI = [
      {
        inputs: [
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];

    // set the LINK token contract address according to the environment
    let linkContractAddr: string;
    switch (networkName) {
      case "binance_test":
        linkContractAddr = "0x84b9b910527ad5c03a9ca831909e21e236ea7b06";
        break;
      case "polygon_amoy":
        linkContractAddr = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
        break;
      default:
        throw new Error(`Unsupported network ${networkName}`);
    }
    // Fund with 1 LINK token
    const amount = toBeHex(1e18);

    // Get signer information
    const [owner] = await hre.ethers.getSigners();

    // Create connection to LINK token contract and initiate the transfer
    const linkTokenContract = new hre.ethers.Contract(linkContractAddr, LINK_TOKEN_ABI, owner);
    await linkTokenContract.transfer(address, amount).then(function (transaction: any) {
      console.info("Contract ", address, " funded with 1 LINK. Transaction Hash: ", transaction.hash);
    });
  });

module.exports = {};
