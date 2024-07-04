import { ethers } from "hardhat";

import { shouldBehaveLikePausable } from "@gemunion/contracts-utils";

import { deployDiamond } from "./shared/fixture";

describe("PausableFacetDiamond", function () {
  const factory = async (facetName = "PausableFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondCM", [facetName], "DiamondCMInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  shouldBehaveLikePausable(factory);
});
