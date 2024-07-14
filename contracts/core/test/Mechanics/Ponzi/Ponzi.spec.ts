import { expect } from "chai";
import { ethers, web3 } from "hardhat";
import { parseEther, WeiPerEther, ZeroAddress } from "ethers";

import { time } from "@openzeppelin/test-helpers";
import { blockAwait } from "@gemunion/contracts-helpers";

import { tokenZero } from "../../constants";
import type { IRule } from "./interface/staking";
import { deployERC1363 } from "../../ERC20/shared/fixtures";
import { isEqualEventArgArrObj } from "../../utils";
import { deployContract } from "@gemunion/contracts-utils";

describe("Ponzi", function () {
  const period = 300;
  const penalty = 0;
  const cycles = 2;

  const erc20Factory = () => deployERC1363("ERC20Simple", { amount: parseEther("1000000000") });

  describe("setRule", function () {
    it("should fail edit when Rule not exist", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.updateRule(2, false);
      await expect(tx1).to.be.revertedWithCustomError(ponziInstance, "NotExist");
    });

    it("should set one Rule", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
    });

    it("should set multiple Rules", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // todo count 2 Events?
    });

    it("should edit Rule", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.updateRule(1, false);
      await expect(tx1).to.emit(ponziInstance, "RuleUpdated").withArgs(1, false);
    });
  });

  describe("Staking", function () {
    it("should fail for not existing rule", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.deposit(owner.address, 2, { value: 100 });
      await expect(tx1).to.be.revertedWithCustomError(ponziInstance, "NotExist");
    });

    it("should fail for not active rule", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: false,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.deposit(owner.address, 1, { value: 100 });
      await expect(tx1).to.be.revertedWithCustomError(ponziInstance, "NotActive");
    });

    it("should fail for wrong pay amount", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.deposit(owner.address, 1, { value: 100 });
      await expect(tx1).to.be.revertedWithCustomError(ponziInstance, "WrongAmount");
    });

    it("should stake NATIVE", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      const tx1 = ponziInstance.deposit(owner.address, 1, { value: 1000 });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
    });

    it("should stake ERC20", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);

      const tx1 = ponziInstance.deposit(owner.address, 1);
      await expect(tx1)
        .to.emit(ponziInstance, "StakingStart")
        .to.emit(erc20Instance, "Transfer")
        .withArgs(owner.address, await ponziInstance.getAddress(), 100);
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);
    });
  });

  describe("Reward", function () {
    it("should fail for wrong staking id", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      // function deposit(address referrer, uint256 ruleId, uint256 tokenId) public payable whenNotPaused {

      const tx1 = ponziInstance.connect(receiver).deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");

      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const tx2 = ponziInstance.connect(receiver).receiveReward(2, true, true);
      await expect(tx2).to.be.revertedWithCustomError(ponziInstance, "WrongStake");
    });

    it("should fail for not an owner", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      const tx1 = ponziInstance.connect(receiver).deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const tx2 = ponziInstance.receiveReward(1, true, true);
      await expect(tx2).to.be.revertedWithCustomError(ponziInstance, "NotAnOwner");
    });

    it("should fail for withdrawn already", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      const tx1 = ponziInstance.connect(receiver).deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const tx2 = await ponziInstance.connect(receiver).receiveReward(1, true, true);
      await expect(tx2).to.emit(ponziInstance, "StakingWithdraw").to.emit(ponziInstance, "StakingFinish");
      await expect(tx2).to.changeEtherBalance(
        receiver,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount *
          2 +
          {
            tokenType: 0, // NATIVE
            token: ZeroAddress,
            tokenId: 0,
            amount: 1000,
          }.amount,
      );

      const tx3 = ponziInstance.connect(receiver).receiveReward(1, true, true);
      await expect(tx3).to.be.revertedWithCustomError(ponziInstance, "Expired");
    });

    it("should stake NATIVE & receive NATIVE", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const tx2 = await ponziInstance.receiveReward(1, true, true);
      await expect(tx2).to.emit(ponziInstance, "StakingWithdraw").to.emit(ponziInstance, "StakingFinish");
      await expect(tx2).to.changeEtherBalance(
        owner,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount *
          cycles +
          {
            tokenType: 0, // NATIVE
            token: ZeroAddress,
            tokenId: 0,
            amount: 1000,
          }.amount,
      );
    });

    it("should stake NATIVE & receive ERC20", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await erc20Instance.mint(await ponziInstance.getAddress(), 100 * cycles);
      const balance1 = await erc20Instance.balanceOf(await ponziInstance.getAddress());
      expect(balance1).to.equal(100 * cycles);
      const tx2 = await ponziInstance.receiveReward(1, true, true);
      await expect(tx2)
        .to.emit(ponziInstance, "StakingWithdraw")
        .to.emit(ponziInstance, "StakingFinish")
        .to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(100 * cycles);
      // DEPOSIT
      await expect(tx2).to.changeEtherBalance(owner, 1000);
    });

    it("should stake ERC20 & receive NATIVE", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx1 = ponziInstance.deposit(owner.address, 1);
      await expect(tx1).to.emit(ponziInstance, "StakingStart").to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const tx2 = await ponziInstance.receiveReward(1, true, true);
      await expect(tx2).to.emit(ponziInstance, "StakingWithdraw").to.emit(ponziInstance, "StakingFinish");
      await expect(tx2).to.changeEtherBalance(
        owner,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount * cycles,
      );
      const balance3 = await erc20Instance.balanceOf(owner.address);
      expect(balance3).to.equal(100);
    });

    it("should stake ERC20 & receive ERC20", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULE
      const tx = ponziInstance.setRules([stakeRule]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");
      // STAKE
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx1 = ponziInstance.deposit(owner.address, 1);
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      await expect(tx1).to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);
      // TIME
      const current = await time.latestBlock();
      await time.advanceBlockTo(current.add(web3.utils.toBN(period * cycles)));
      // REWARD
      await erc20Instance.mint(await ponziInstance.getAddress(), 100 * cycles);
      const tx2 = await ponziInstance.receiveReward(1, true, true);
      await expect(tx2).to.emit(ponziInstance, "StakingWithdraw");
      await expect(tx2).to.emit(ponziInstance, "StakingFinish");
      const balance3 = await erc20Instance.balanceOf(owner.address);
      expect(balance3).to.equal(100 * cycles + 100);
    });
  });

  describe("Finalize", function () {
    it("should fail send ETH", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const tx = owner.sendTransaction({
        to: await ponziInstance.getAddress(),
        value: WeiPerEther,
      });

      await expect(tx).to.be.reverted;
    });

    it("should fund ETH", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const tx = await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );
      const lib = await ethers.getContractAt("ExchangeUtils", await ponziInstance.getAddress(), owner);
      await expect(tx)
        .to.emit(lib, "PaymentEthReceived")
        .withArgs(await ponziInstance.getAddress(), WeiPerEther);
    });

    it("should finalize", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");

      const tx = await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );

      await expect(tx).to.changeEtherBalance(ponziInstance, WeiPerEther);

      const tx1 = ponziInstance.finalize();
      await expect(tx1).to.changeEtherBalance(owner, WeiPerEther);
    });

    it("should finalize by Rule", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // STAKE 1
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);

      // STAKE 2
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx2 = ponziInstance.deposit(owner.address, 2);
      await expect(tx2).to.emit(ponziInstance, "StakingStart");
      await expect(tx2).to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);

      // FINALIZE 1
      const tx3 = ponziInstance.finalizeByRuleId(1);
      await expect(tx3).to.changeEtherBalance(owner, 1000);

      // FINALIZE 2
      const tx4 = ponziInstance.finalizeByRuleId(2);
      await expect(tx4).to.changeTokenBalance(erc20Instance, owner, 100);
    });

    it("should finalize by Token", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // STAKE 1
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);

      // STAKE 2
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx2 = ponziInstance.deposit(owner.address, 2);
      await expect(tx2).to.emit(ponziInstance, "StakingStart");
      await expect(tx2).to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);

      // FINALIZE 1
      const tx3 = ponziInstance.finalizeByToken(tokenZero);
      await expect(tx3).to.changeEtherBalance(owner, 1000);

      // FINALIZE 2
      const tx4 = ponziInstance.finalizeByToken(await erc20Instance.getAddress());
      await expect(tx4).to.changeTokenBalance(erc20Instance, owner, 100);
    });

    it("should fail finalize by Rule: 0 balance", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // FINALIZE 1
      const tx3 = ponziInstance.finalizeByRuleId(1);
      await expect(tx3).to.be.revertedWithCustomError(ponziInstance, "ZeroBalance");

      // FINALIZE 2
      const tx4 = ponziInstance.finalizeByRuleId(2);
      await expect(tx4).to.be.revertedWithCustomError(ponziInstance, "ZeroBalance");
    });

    it("should fail finalize by Token: 0 balance", async function () {
      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // FINALIZE 1
      const tx3 = ponziInstance.finalizeByToken(tokenZero);
      await expect(tx3).to.be.revertedWithCustomError(ponziInstance, "ZeroBalance");

      // FINALIZE 2
      const tx4 = ponziInstance.finalizeByToken(await erc20Instance.getAddress());
      await expect(tx4).to.be.revertedWithCustomError(ponziInstance, "ZeroBalance");
    });
  });

  describe("Withdraw", function () {
    it("should Fund and Withdraw ETH", async function () {
      const ponziInstance = await deployContract("Ponzi");

      const amnt = parseEther("99.0");
      const amnt1 = parseEther("9.0");
      await ponziInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("99.0"),
          },
        ],
        { value: amnt },
      );

      await blockAwait();
      // WITHDRAW ETH
      const estimateGas: bigint = await ponziInstance.withdrawToken.estimateGas(tokenZero, amnt1);
      const tx3 = ponziInstance.withdrawToken(tokenZero, amnt1, {
        gasLimit: estimateGas + (estimateGas / 100n) * 10n,
      });
      await expect(tx3).to.emit(ponziInstance, "WithdrawToken").withArgs(ZeroAddress, amnt1);
    });

    it("should Withdraw after Deposit", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // STAKE 1
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);

      // STAKE 2
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx2 = ponziInstance.deposit(owner.address, 2);
      await expect(tx2).to.emit(ponziInstance, "StakingStart");
      await expect(tx2).to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);

      // WITHDRAW 1
      const tx3 = ponziInstance.withdrawToken(
        tokenZero,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount / 2,
      );
      await expect(tx3).to.changeEtherBalance(
        owner,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount / 2,
      );

      // WITHDRAW 2
      const tx4 = ponziInstance.withdrawToken(await erc20Instance.getAddress(), 100 / 2);
      await expect(tx4).to.changeTokenBalance(erc20Instance, owner, 100 / 2);
    });

    it("should fail Withdraw: balance exceeded", async function () {
      const [owner] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1: IRule = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2: IRule = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // STAKE 1
      const tx1 = ponziInstance.deposit(owner.address, 1, {
        value: 1000,
      });
      await expect(tx1).to.emit(ponziInstance, "StakingStart");
      const stakeBalance = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance).to.equal(1000);

      // STAKE 2
      await erc20Instance.mint(owner.address, 100);
      const balance1 = await erc20Instance.balanceOf(owner.address);
      expect(balance1).to.equal(100);
      await erc20Instance.approve(await ponziInstance.getAddress(), 100);
      const tx2 = ponziInstance.deposit(owner.address, 2);
      await expect(tx2).to.emit(ponziInstance, "StakingStart");
      await expect(tx2).to.emit(erc20Instance, "Transfer");
      const balance2 = await erc20Instance.balanceOf(owner.address);
      expect(balance2).to.equal(0);

      // WITHDRAW 1
      const tx3 = ponziInstance.withdrawToken(
        tokenZero,
        {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        }.amount * 2,
      );
      await expect(tx3).to.be.revertedWithCustomError(ponziInstance, "BalanceExceed");

      // WITHDRAW 2
      const tx4 = ponziInstance.withdrawToken(await erc20Instance.getAddress(), 100 * 2);
      await expect(tx4).to.be.revertedWithCustomError(ponziInstance, "BalanceExceed");
    });
  });

  describe("Referral", function () {
    it("should Deposit with Ref", async function () {
      const [owner, receiver, stranger] = await ethers.getSigners();

      const ponziInstance = await deployContract("Ponzi");
      const erc20Instance = await erc20Factory();

      const stakeRule1 = {
        deposit: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: WeiPerEther,
        },
        reward: {
          tokenType: 0, // NATIVE
          token: ZeroAddress,
          tokenId: 0,
          amount: 1000,
        },
        terms: {
          maxCycles: 2,
          period, // 60 sec
          penalty,
        },
        active: true,
      };

      const stakeRule2 = {
        deposit: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        reward: {
          tokenType: 1, // ERC20
          token: await erc20Instance.getAddress(),
          tokenId: 0,
          amount: 100,
        },
        terms: { maxCycles: 2, period, penalty },
        active: true,
      };

      // SET RULES
      const tx = ponziInstance.setRules([stakeRule1, stakeRule2]);
      await expect(tx).to.emit(ponziInstance, "RuleCreatedP");

      // STAKE 1-1
      const tx11 = ponziInstance.connect(owner).deposit(receiver.address, 1, {
        value: stakeRule1.deposit.amount,
      });
      await expect(tx11).to.emit(ponziInstance, "StakingStart");
      const stakeBalance1 = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance1).to.equal(stakeRule1.deposit.amount);
      await expect(tx11)
        .to.emit(ponziInstance, "ReferralEvent")
        .withArgs(
          owner.address,
          receiver.address,
          isEqualEventArgArrObj({
            tokenType: 0n, // NATIVE
            token: ZeroAddress,
            tokenId: 0n,
            amount: WeiPerEther,
          }),
        );

      // STAKE 1-2
      const tx12 = ponziInstance.connect(stranger).deposit(owner.address, 1, {
        value: stakeRule1.deposit.amount,
      });
      await expect(tx12).to.emit(ponziInstance, "StakingStart");
      const stakeBalance2 = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance2).to.equal(stakeRule1.deposit.amount * 2n);
      await expect(tx12)
        .to.emit(ponziInstance, "ReferralEvent")
        .withArgs(
          stranger.address,
          owner.address,
          isEqualEventArgArrObj({
            tokenType: 0n, // NATIVE
            token: ZeroAddress,
            tokenId: 0n,
            amount: WeiPerEther,
          }),
        );

      // STAKE 1-3
      const tx13 = ponziInstance.connect(receiver).deposit(stranger.address, 1, {
        value: stakeRule1.deposit.amount,
      });
      await expect(tx13).to.emit(ponziInstance, "StakingStart");
      const stakeBalance3 = await ethers.provider.getBalance(await ponziInstance.getAddress());
      expect(stakeBalance3).to.equal(stakeRule1.deposit.amount * 3n);
      await expect(tx13)
        .to.emit(ponziInstance, "ReferralEvent")
        .withArgs(
          receiver.address,
          stranger.address,
          isEqualEventArgArrObj({
            tokenType: 0n, // NATIVE
            token: ZeroAddress,
            tokenId: 0n,
            amount: WeiPerEther,
          }),
        );
    });
  });
});
