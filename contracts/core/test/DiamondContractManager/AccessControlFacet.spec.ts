import { ethers } from "hardhat";

import { DEFAULT_ADMIN_ROLE } from "@gemunion/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";

import { deployDiamond } from "./shared/fixture";

describe("AccessControlFacetDiamond", function () {
  const factory = async (facetName = "AccessControlFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondCM", [facetName, "DiamondLoupeFacet"], "DiamondCMInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE);
});
