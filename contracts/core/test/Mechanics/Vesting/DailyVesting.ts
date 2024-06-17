import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeOwnable } from "@gemunion/contracts-access";
import { InterfaceId } from "@gemunion/contracts-constants";

import { deployVesting } from "./shared/fixture";
import { calc2 } from "./shared/calc2";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";

describe("DailyVesting", function () {
  const factory = () => deployVesting("DailyVesting", 12, 13698);

  shouldBehaveLikeOwnable(factory);
  shouldBehaveLikeTopUp(factory);

  describe("release", function () {
    it("AdvisorsVesting", async function () {
      await calc2("DailyVesting", 12, 13698);
    });

    it("MarketingVesting", async function () {
      await calc2("DailyVesting", 1, 48912);
    });

    it("PartnershipVesting", async function () {
      await calc2("DailyVesting", 6, 13679);
    });

    it("PreSeedSaleVesting", async function () {
      await calc2("DailyVesting", 3, 13337);
    });

    it("PrivateSaleVesting", async function () {
      await calc2("DailyVesting", 1, 18915);
    });

    it("PublicSaleVesting", async function () {
      await calc2("DailyVesting", 0, 54944);
    });

    it("SeedSaleVesting", async function () {
      await calc2("DailyVesting", 2, 15547);
    });

    it("TeamVesting", async function () {
      await calc2("DailyVesting", 12, 13698);
    });

    it("InitialLiquidityVesting", async function () {
      await calc2("DailyVesting", 0, 5000);
    });

    it("TreasuryVesting", async function () {
      await calc2("DailyVesting", 3, 10000);
    });
  });

  shouldSupportsInterface(factory)([InterfaceId.IERC165, InterfaceId.IERC1363Receiver, InterfaceId.IERC1363Spender]);
});
