import { ethers } from "hardhat";

import { deployDiamond } from "./shared/fixture";
import { shouldBehaveLikePausable } from "./PausableFacet/index";

describe("CollectionFactoryDiamond", function () {
  const factory = async (facetName = "PausableFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondCM", [facetName], "DiamondCMInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  shouldBehaveLikePausable(factory);
});
