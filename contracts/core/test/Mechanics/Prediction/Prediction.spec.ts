import { shouldBehaveLikePausable, shouldSupportsInterface } from "@gemunion/contracts-utils";
import { InterfaceId } from "@gemunion/contracts-constants";

import { TokenType } from "@gemunion/types-blockchain";

import { shouldBehaveLikePrediction } from "./shared/predictionBehavior";
import { deployPredictionContract } from "./shared/fixtures";

describe("Prediction", function () {
  shouldBehaveLikePausable(deployPredictionContract);

  shouldBehaveLikePrediction(deployPredictionContract, TokenType.NATIVE);
  shouldBehaveLikePrediction(deployPredictionContract, TokenType.ERC20);

  // TODO
  // test claimTreasury
  // test getPrediction
  // test placeBet and resolvePrediction when paused

  shouldSupportsInterface(deployPredictionContract)([
    InterfaceId.IERC165,
    InterfaceId.IERC1363Receiver,
    InterfaceId.IERC1363Spender,
    InterfaceId.IAccessControl,
  ]);
});
