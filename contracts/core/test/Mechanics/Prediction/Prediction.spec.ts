import { shouldBehaveLikePredictionContract } from "./shared/predictionBehavior";
import { TokenType } from "./shared/utils";
import { deployPredictionContract } from "./shared/fixtures";

const isVerbose = process.env.VERBOSE === "true";

describe("Prediction", function () {
  shouldBehaveLikePredictionContract(deployPredictionContract, TokenType.ERC20, isVerbose);
  shouldBehaveLikePredictionContract(deployPredictionContract, TokenType.NATIVE, isVerbose);
});
