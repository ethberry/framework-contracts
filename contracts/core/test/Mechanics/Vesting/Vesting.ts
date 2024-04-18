import { shouldSupportsInterface } from "@gemunion/contracts-utils";
import { shouldBehaveLikeOwnable } from "@gemunion/contracts-access";
import { InterfaceId } from "@gemunion/contracts-constants";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { deployVesting } from "./shared/fixture";
import { calc } from "./shared/calc";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";
import { expect } from "chai";

describe("Vesting", function () {
  const factory = () => deployVesting("Vesting", 12, 417);

  shouldBehaveLikeOwnable(factory);
  shouldBehaveLikeTopUp(factory);

  describe("approve", function () {
    it("should approve to owner at init", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();
      const approved = await contractInstance.approved();
      expect(approved).to.equal(owner.address);
    });

    it("should approve receiver to transfer ownership", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();
      const approved = await contractInstance.approved();
      expect(approved).to.equal(owner.address);

      const tx = contractInstance.approve(receiver.address);
      await expect(tx).to.emit(contractInstance, "Approval").withArgs(owner.address, receiver.address);

      const approved1 = await contractInstance.approved();
      expect(approved1).to.equal(receiver.address);

      const tx1 = contractInstance.connect(receiver).transferOwnership(stranger.address);
      await expect(tx1).to.emit(contractInstance, "OwnershipTransferred").withArgs(owner.address, stranger.address);
    });

    it("should fail stranger to transfer ownership", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();
      const contractInstance = await factory();
      const approved = await contractInstance.approved();
      expect(approved).to.equal(owner.address);

      const tx = contractInstance.approve(receiver.address);
      await expect(tx).to.emit(contractInstance, "Approval").withArgs(owner.address, receiver.address);

      const approved1 = await contractInstance.approved();
      expect(approved1).to.equal(receiver.address);

      const tx1 = contractInstance.connect(stranger).transferOwnership(receiver.address);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "OwnableUnauthorizedAccount");
    });

    it("should fail approve - zero address", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();
      const approved = await contractInstance.approved();
      expect(approved).to.equal(owner.address);

      const tx = contractInstance.approve(ZeroAddress);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "OwnableInvalidOwner");
    });
  });

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
