import { task } from "hardhat/config";
import { toBeHex } from "ethers";

task("fund-vrf-sub", "Funds vRF subscription with LINK")
  .addParam("vrf", "The address of VRF con")
  .addParam("sub", "The SubId")
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
      case "rinkeby":
        linkContractAddr = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
        break;
      case "binancetest":
        linkContractAddr = "0x84b9b910527ad5c03a9ca831909e21e236ea7b06";
        break;
      case "mumbai":
        linkContractAddr = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
        break;
      default:
        // default to rinkeby
        linkContractAddr = "0x01BE23585060835E02B77ef475b0Cc51aA1e0709";
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
