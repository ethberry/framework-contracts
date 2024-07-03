import "@nomicfoundation/hardhat-toolbox";

import { shouldPauseTheContract } from "./shouldPauseTheContract";
import { shouldUnpauseTheContract } from "./shouldUnpauseTheContract";
import { shouldNotAllowPauseWhenPaused } from "./shouldNotAllowPauseWhenPaused";
import { shouldNotAllowUnpauseWhenNotPaused } from "./shouldNotAllowUnpauseWhenNotPaused";

export function shouldBehaveLikePausable(factory: () => Promise<any>) {
  shouldPauseTheContract(factory);
  shouldUnpauseTheContract(factory);
  shouldNotAllowPauseWhenPaused(factory);
  shouldNotAllowUnpauseWhenNotPaused(factory);
}

export {
  shouldPauseTheContract,
  shouldUnpauseTheContract,
  shouldNotAllowPauseWhenPaused,
  shouldNotAllowUnpauseWhenNotPaused,
};
