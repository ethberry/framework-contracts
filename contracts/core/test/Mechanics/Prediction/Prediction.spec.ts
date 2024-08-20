import { shouldBehaveLikePredictionContract, shouldBehaveLikePredictionContractWithNative } from "./shared/predictionBehavior";
import { deployPredictionContract, deployPredictionContractWithNativeBetUnit } from "./shared/fixtures";

const isVerbose = process.env.VERBOSE === "true";

describe("Prediction", function () {
  const factory = () => deployPredictionContract();
  const nativeFactory = () => deployPredictionContractWithNativeBetUnit();

  shouldBehaveLikePredictionContract(factory, isVerbose);
  shouldBehaveLikePredictionContractWithNative(nativeFactory, isVerbose);
});
