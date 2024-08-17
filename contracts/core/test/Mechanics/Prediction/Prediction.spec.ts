// import { shouldBehaveLikePausable } from "@gemunion/contracts-utils";

import { shouldBehaveLikePredictionContract } from "./shared/predictionBehavior";
import { deployPredictionContract } from "./shared/fixtures";

const isVerbose = process.env.VERBOSE === "true";

describe("Prediction", function () {
  const factory = () => deployPredictionContract();

  shouldBehaveLikePredictionContract(factory, isVerbose);

  // shouldBehaveLikePausable(factory);
});
