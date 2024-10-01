import { ethers } from "hardhat";

import { DEFAULT_ADMIN_ROLE } from "@ethberry/contracts-constants";
import { shouldBehaveLikeAccessControl } from "@ethberry/contracts-access";

import { deployDiamond } from "../Exchange/shared";

describe("AccessControlFacetDiamond", function () {
  const factory = async (facetName = "AccessControlFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond("DiamondCM", [facetName, "DiamondLoupeFacet"], "DiamondCMInit", {
      logSelectors: false,
    });
    return ethers.getContractAt(facetName, diamondInstance);
  };

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE);
});
