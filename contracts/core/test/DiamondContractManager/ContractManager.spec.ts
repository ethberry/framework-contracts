import { expect } from "chai";
import { ethers } from "hardhat";

import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { DEFAULT_ADMIN_ROLE, METADATA_ROLE, MINTER_ROLE, PREDICATE_ROLE } from "@gemunion/contracts-constants";
import { deployDiamond } from "./shared/fixture";

describe("ContractManagerDiamond", function () {
  const factory = async (facetName = "AccessControlFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondCM",
      [
        "ERC20FactoryFacet",
        "ERC721FactoryFacet",
        "ERC998FactoryFacet",
        "ERC1155FactoryFacet",
        "LotteryFactoryFacet",
        "MysteryBoxFactoryFacet",
        "PonziFactoryFacet",
        "RaffleFactoryFacet",
        "StakingFactoryFacet",
        "VestingFactoryFacet",
        "WaitListFactoryFacet",
        "UseFactoryFacet",
        "AccessControlFacet",
        "PausableFacet",
      ],
      "DiamondCMInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE);

  describe("addFactory", function () {
    describe("MINTER_ROLE", function () {
      it("should set minters (zero)", async function () {
        const contractInstance = await factory("UseFactoryFacet");

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(0);
      });

      it("factory already exists", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        await contractInstance.addFactory(receiver.address, MINTER_ROLE);
        const tx = contractInstance.addFactory(receiver.address, MINTER_ROLE);
        await expect(tx).to.not.be.reverted;
      });

      it("should set minters (one)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");
        await contractInstance.addFactory(receiver.address, MINTER_ROLE);

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(1);
        expect(minters[0]).to.equal(receiver.address);
      });
    });

    describe("METADATA_ROLE", function () {
      it("should set manipulators (zero)", async function () {
        const contractInstance = await factory("UseFactoryFacet");

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(0);
      });

      it("factory already exists", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");
        await contractInstance.addFactory(receiver.address, METADATA_ROLE);
        const tx = contractInstance.addFactory(receiver.address, METADATA_ROLE);
        await expect(tx).to.not.be.reverted;
      });

      it("should set manipulators (one)", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");
        await contractInstance.addFactory(receiver.address, METADATA_ROLE);

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(1);
        expect(manipulators[0]).to.equal(receiver.address);
      });
    });

    describe("DEFAULT_ADMIN_ROLE", function () {
      it("should set minters and manipulators", async function () {
        const [_owner, receiver, stranger] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        await contractInstance.addFactory(receiver.address, DEFAULT_ADMIN_ROLE);
        await contractInstance.addFactory(stranger.address, DEFAULT_ADMIN_ROLE);

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(2);
        expect(minters[0]).to.equal(receiver.address);
        expect(minters[1]).to.equal(stranger.address);

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(2);
        expect(manipulators[0]).to.equal(receiver.address);
        expect(manipulators[1]).to.equal(stranger.address);
      });
    });

    describe("PREDICATE_ROLE", function () {
      it("should fail add: wrong role", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        const tx = contractInstance.addFactory(receiver.address, PREDICATE_ROLE);
        await expect(tx).to.be.revertedWithCustomError(contractInstance, "WrongRole");
      });

      it("should fail: AccessControlUnauthorizedAccount", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        const tx = contractInstance.connect(receiver).addFactory(receiver.address, PREDICATE_ROLE);
        await expect(tx)
          .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
          .withArgs(receiver.address, DEFAULT_ADMIN_ROLE);
      });
    });
  });

  describe("removeFactory", function () {
    describe("MINTER_ROLE", function () {
      it("should remove minters", async function () {
        const [_owner, receiver, stranger] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        await contractInstance.addFactory(receiver.address, MINTER_ROLE);
        await contractInstance.addFactory(receiver.address, METADATA_ROLE);
        await contractInstance.addFactory(stranger.address, MINTER_ROLE);
        await contractInstance.addFactory(stranger.address, METADATA_ROLE);

        await contractInstance.removeFactory(receiver.address, MINTER_ROLE);

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(1);
        expect(minters[0]).to.equal(stranger.address);

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(2);
        expect(manipulators[0]).to.equal(receiver.address);
        expect(manipulators[1]).to.equal(stranger.address);
      });
    });

    describe("METADATA_ROLE", function () {
      it("should remove manipulators", async function () {
        const [_owner, receiver, stranger] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        await contractInstance.addFactory(receiver.address, MINTER_ROLE);
        await contractInstance.addFactory(receiver.address, METADATA_ROLE);
        await contractInstance.addFactory(stranger.address, MINTER_ROLE);
        await contractInstance.addFactory(stranger.address, METADATA_ROLE);

        await contractInstance.removeFactory(receiver.address, METADATA_ROLE);

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(2);
        expect(minters[0]).to.equal(receiver.address);
        expect(minters[1]).to.equal(stranger.address);

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(1);
        expect(manipulators[0]).to.equal(stranger.address);
      });
    });

    describe("DEFAULT_ADMIN_ROLE", function () {
      it("should remove manipulators", async function () {
        const [_owner, receiver, stranger] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        await contractInstance.addFactory(receiver.address, MINTER_ROLE);
        await contractInstance.addFactory(receiver.address, METADATA_ROLE);
        await contractInstance.addFactory(stranger.address, MINTER_ROLE);
        await contractInstance.addFactory(stranger.address, METADATA_ROLE);

        await contractInstance.removeFactory(receiver.address, DEFAULT_ADMIN_ROLE);

        const minters = await contractInstance.getMinters();
        expect(minters).to.have.lengthOf(1);
        expect(minters[0]).to.equal(stranger.address);

        const manipulators = await contractInstance.getManipulators();
        expect(manipulators).to.have.lengthOf(1);
        expect(manipulators[0]).to.equal(stranger.address);
      });
    });

    describe("PREDICATE_ROLE", function () {
      it("should fail add: wrong role", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        const tx = contractInstance.removeFactory(receiver.address, PREDICATE_ROLE);
        await expect(tx).to.be.revertedWithCustomError(contractInstance, "WrongRole");
      });

      it("should fail add: account is missing role", async function () {
        const [_owner, receiver] = await ethers.getSigners();

        const contractInstance = await factory("UseFactoryFacet");

        const tx = contractInstance.connect(receiver).removeFactory(receiver.address, PREDICATE_ROLE);
        await expect(tx)
          .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
          .withArgs(receiver.address, DEFAULT_ADMIN_ROLE);
      });
    });
  });
});
