import { shouldStartPrediction } from "./start";
import { shouldBetPosition } from "./bet";
import { shouldResolvePrediction } from "./resolve";
import { shouldClaim } from "./claim";
import { deployTokenAsBetAsset, getNativeBetAsset } from "./fixtures";
import { TokenType } from "./utils";

export function shouldBehaveLikePredictionContract(predictionFactory, tokenType, isVerbose = false) {
  describe(`prediction behavior with ${tokenType === 1 ? "ERC20" : "NATIVE"} tokens`, function () {
    const tokenFactory = TokenType.NATIVE === tokenType ? getNativeBetAsset : deployTokenAsBetAsset;
    shouldStartPrediction(predictionFactory, tokenFactory, isVerbose);
    shouldBetPosition(predictionFactory, tokenFactory, isVerbose);
    shouldResolvePrediction(predictionFactory, tokenFactory, isVerbose);
    shouldClaim(predictionFactory, tokenFactory, isVerbose);
  });
}
