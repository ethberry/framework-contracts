import { ethers } from "hardhat";
import { MaxUint256 } from "ethers";
import { deployERC1363 } from "../../../ERC20/shared/fixtures";

export async function deployPredictionContract() {
  const [owner, admin, operator, bettor1, bettor2] = await ethers.getSigners();

  const token = await deployERC1363("ERC20Simple", { amount: MaxUint256 });

  const treasuryFee = BigInt(1000);

  const PredictionContractFactory = await ethers.getContractFactory("Prediction");
  const prediction = await PredictionContractFactory.deploy(
    token,
    admin,
    operator,
    3, // minimum bet 3 units
    ethers.parseUnits("5", 18), // 1 stake unit equals 5 tokens
    treasuryFee,
  );

  return { prediction, token, owner, admin, operator, bettor1, bettor2, treasuryFee };
}
