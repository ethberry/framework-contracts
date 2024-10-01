import { ethers } from "hardhat";

import { shouldBehaveLikePausable } from "@ethberry/contracts-utils";

import { deployDiamond } from "../Exchange/shared";

describe.skip("PausableFacetDiamond", function () {
  const factory = async (facetName = "PausableFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondCM", [facetName, "DiamondLoupeFacet"], "DiamondCMInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, diamondInstance);
  };

  shouldBehaveLikePausable(factory);
});
