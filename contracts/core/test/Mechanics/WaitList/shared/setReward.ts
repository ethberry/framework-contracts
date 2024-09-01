import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

import { DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce } from "@gemunion/contracts-constants";

import { deployERC721 } from "../../../ERC721/shared/fixtures";
import { expiresAt, externalId, tokenId } from "../../../constants";
import { isEqualEventArgArrObj } from "../../../utils";

export function shouldSetReward(factory: () => Promise<any>) {
  describe("setReward", function () {
    it("should set reward", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, contractInstance);

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
        },
      ];

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const params = {
        externalId,
        expiresAt,
        nonce,
        extra: merkleTree.root,
        receiver: ZeroAddress,
        referrer: ZeroAddress,
      };

      const tx = contractInstance.setReward(params, items);
      await expect(tx)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));
    });

    it("should fail: account is missing role", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, contractInstance);

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const params = {
        externalId,
        expiresAt,
        nonce,
        extra: merkleTree.root,
        receiver: ZeroAddress,
        referrer: ZeroAddress,
      };

      const tx = contractInstance.connect(receiver).setReward(params, []);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver.address, DEFAULT_ADMIN_ROLE);
    });

    it("should fail: WaitListNoReward", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, contractInstance);

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const params = {
        externalId,
        expiresAt,
        nonce,
        extra: merkleTree.root,
        receiver: ZeroAddress,
        referrer: ZeroAddress,
      };

      const tx = contractInstance.setReward(params, []);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WaitListNoReward");
    });

    it("should fail: WaitListRootAlreadySet", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, contractInstance);

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount: 1n,
        },
      ];

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const params = {
        externalId,
        expiresAt,
        nonce,
        extra: merkleTree.root,
        receiver: ZeroAddress,
        referrer: ZeroAddress,
      };

      const tx = contractInstance.setReward(params, items);
      await expect(tx)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const tx2 = contractInstance.setReward(params, items);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "WaitListRootAlreadySet");
    });
  });
}
