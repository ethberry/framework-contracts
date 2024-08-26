import { InterfaceId } from "@gemunion/contracts-constants";
import { deployContract, shouldSupportsInterface } from "@gemunion/contracts-utils";

import { FrameworkInterfaceId } from "../../constants";
import { shouldReceive } from "../../shared/receive";
import { shouldDisperse } from "./shared/disperse";

describe("Dispenser", function () {
  const factory = () => deployContract("Dispenser");

  shouldDisperse(factory);
  shouldReceive(factory);

  shouldSupportsInterface(factory)([InterfaceId.IERC165, FrameworkInterfaceId.Dispenser]);
});
