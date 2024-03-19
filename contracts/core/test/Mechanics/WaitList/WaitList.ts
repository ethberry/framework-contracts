import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

import { amount, DEFAULT_ADMIN_ROLE, MINTER_ROLE, nonce } from "@gemunion/contracts-constants";
import { shouldBehaveLikePausable } from "@gemunion/contracts-utils";
import { shouldBehaveLikeAccessControl } from "@gemunion/contracts-access";
import { deployContract } from "@gemunion/contracts-mocks";

import { deployERC20 } from "../../ERC20/shared/fixtures";
import { deployERC721 } from "../../ERC721/shared/fixtures";
import { deployERC998 } from "../../ERC998/shared/fixtures";
import { deployERC1155 } from "../../ERC1155/shared/fixtures";
import { expiresAt, externalId, tokenId } from "../../constants";
import { isEqualEventArgArrObj } from "../../utils";
import { shouldBehaveLikeTopUp } from "../../shared/topUp";

describe("WaitList", function () {
  const factory = () => deployContract(this.title);

  shouldBehaveLikeAccessControl(factory)(DEFAULT_ADMIN_ROLE);
  shouldBehaveLikePausable(factory);
  shouldBehaveLikeTopUp(factory);

  describe("setReward", function () {
    it("should set reward", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

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

    it("should fail: WrongAmount", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

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
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "WrongAmount");
    });

    it("should fail: AlreadyExist", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "AlreadyExist");
    });
  });

  describe("claim", function () {
    it("should claim reward (NATIVE)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();

      const items = [
        {
          tokenType: 0n,
          token: ZeroAddress,
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      await contractInstance.topUp(
        [
          {
            tokenType: 0n,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        { value: amount },
      );

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(owner.address, externalId, isEqualEventArgArrObj(...items));
      await expect(tx2).to.changeEtherBalances([owner, contractInstance], [amount, -amount]);
    });

    it("should claim reward (ERC20)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc20Instance = await deployERC20();

      await erc20Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 1n,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      await erc20Instance.mint(owner.address, amount);
      await erc20Instance.approve(await contractInstance.getAddress(), amount);
      await contractInstance.topUp([
        {
          tokenType: 1,
          token: await erc20Instance.getAddress(),
          tokenId,
          amount,
        },
      ]);

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(owner.address, externalId, isEqualEventArgArrObj(...items))
        .to.emit(erc20Instance, "Transfer")
        .withArgs(await contractInstance.getAddress(), owner.address, amount);

      await expect(tx2).changeTokenBalances(erc20Instance, [owner, contractInstance], [amount, -amount]);
    });

    it("should claim reward (ERC721)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(owner.address, externalId, isEqualEventArgArrObj(...items))
        .to.emit(erc721Instance, "Transfer")
        .withArgs(ZeroAddress, owner.address, tokenId);
    });

    it("should claim reward (ERC998)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc998Instance = await deployERC998();

      await erc998Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 3n,
          token: await erc998Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(owner.address, externalId, isEqualEventArgArrObj(...items))
        .to.emit(erc998Instance, "Transfer")
        .withArgs(ZeroAddress, owner.address, tokenId);
    });

    it("should claim reward (ERC1155)", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc1155Instance = await deployERC1155();

      await erc1155Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 4n,
          token: await erc1155Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(owner.address, externalId, isEqualEventArgArrObj(...items))
        .to.emit(erc1155Instance, "TransferSingle")
        .withArgs(await contractInstance.getAddress(), ZeroAddress, owner.address, tokenId, amount);
    });

    it("should claim reward as receiver", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([receiver.address]));

      const tx2 = contractInstance.connect(receiver).claim(proof, externalId);
      await expect(tx2)
        .to.emit(contractInstance, "WaitListRewardClaimed")
        .withArgs(receiver.address, externalId, isEqualEventArgArrObj(...items));
    });

    it("should fail: pause", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      await contractInstance.pause();
      const tx1 = contractInstance.claim(proof, externalId);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "EnforcedPause");
    });

    it("should fail: Not yet started", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const leavesEntities = [[owner.address], [receiver.address], [stranger.address]];

      const merkleTree = StandardMerkleTree.of(leavesEntities, ["address"]);

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx1 = contractInstance.claim(proof, externalId);
      await expect(tx1).to.be.revertedWithCustomError(contractInstance, "NotExist");
    });

    it("should fail: sender is not in the wait list", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx2 = contractInstance.connect(receiver).claim(proof, externalId);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "NotInList");
    });

    it("should fail: Reward already claimed", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const contractInstance = await factory();
      const erc721Instance = await deployERC721();

      await erc721Instance.grantRole(MINTER_ROLE, await contractInstance.getAddress());

      const items = [
        {
          tokenType: 2n,
          token: await erc721Instance.getAddress(),
          tokenId,
          amount,
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

      const tx1 = contractInstance.setReward(params, items);
      await expect(tx1)
        .to.emit(contractInstance, "WaitListRewardSet")
        .withArgs(params.externalId, merkleTree.root, isEqualEventArgArrObj(...items));

      const proof = merkleTree.getProof(merkleTree.leafLookup([owner.address]));

      const tx2 = contractInstance.claim(proof, externalId);
      await expect(tx2).to.emit(contractInstance, "WaitListRewardClaimed");

      const tx3 = contractInstance.claim(proof, externalId);
      await expect(tx3).to.be.revertedWithCustomError(contractInstance, "Expired");
    });
  });
});
