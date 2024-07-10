import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeOwnable } from "@gemunion/contracts-access";
import { InterfaceId } from "@gemunion/contracts-constants";

import { deployVesting } from "./shared/fixture";
import { calc } from "./shared/calc";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";

describe("Vesting", function () {
  const factory = () => deployVesting("Vesting", 12, 417);

  shouldBehaveLikeOwnable(factory);
  shouldBehaveLikeTopUp(factory);

  describe("release", function () {
    it("AdvisorsVesting", async function () {
      await calc("Vesting", 12, 417);
    });

    it("MarketingVesting", async function () {
      await calc("Vesting", 1, 1500);
    });

    it("PartnershipVesting", async function () {
      await calc("Vesting", 6, 417);
    });

    it("PreSeedSaleVesting", async function () {
      await calc("Vesting", 3, 416);
    });

    it("PrivateSaleVesting", async function () {
      await calc("Vesting", 1, 624);
    });

    it("PublicSaleVesting", async function () {
      await calc("Vesting", 0, 3333);
    });

    it("SeedSaleVesting", async function () {
      await calc("Vesting", 2, 500);
    });

    it("TeamVesting", async function () {
      await calc("Vesting", 12, 417);
    });

    it("InitialLiquidityVesting", async function () {
      await calc("Vesting", 0, 5000);
    });

    it("TreasuryVesting", async function () {
      await calc("Vesting", 3, 10000);
    });
  });

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
