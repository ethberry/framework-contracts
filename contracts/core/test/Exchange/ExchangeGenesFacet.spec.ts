import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

import { amount, nonce } from "@gemunion/contracts-constants";
import { VRFCoordinatorV2PlusMock } from "../../typechain-types";
import { deployDiamond, deployErc721Base, wrapOneToOneSignature } from "./shared";
import { deployLinkVrfFixture } from "../shared/link";
import { randomRequest } from "../shared/randomRequest";
import { isEqualEventArgObj } from "../utils";
import { externalId, params, tokenAttributes } from "../constants";

describe("Diamond Exchange Genes", function () {
  const factory = async (facetName = "ExchangeGenesFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, diamondInstance);
  };

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    return wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
  };

  let vrfInstance: VRFCoordinatorV2PlusMock;
  let subId: bigint;

  before(async function () {
    await network.provider.send("hardhat_reset");

    // https://github.com/NomicFoundation/hardhat/issues/2980
    ({ vrfInstance, subId } = await loadFixture(function exchange() {
      return deployLinkVrfFixture();
    }));
  });

  after(async function () {
    await network.provider.send("hardhat_reset");
  });

  describe("breed", function () {
    describe("ERC721Genes", function () {
      it("should breed", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const genes = 12345;

        const exchangeInstance = await factory();
        const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

        const tx01 = await erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintGenes(receiver.address, 1, genes);
        await erc721Instance.mintGenes(receiver.address, 2, genes);

        await erc721Instance.connect(receiver).approve(exchangeInstance.target, 1);
        await erc721Instance.connect(receiver).approve(exchangeInstance.target, 2);

        const generateSignature = await getSignatures(exchangeInstance);

        const mother = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 1n,
          amount,
        };

        const father = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 2n,
          amount,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: mother,
          price: father,
        });

        const breedTx = exchangeInstance.connect(receiver).breed(params, mother, father, signature);

        await expect(breedTx)
          .to.emit(exchangeInstance, "Breed")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgObj({ tokenType: "2", token: erc721Instance.target, tokenId: "1", amount: `${amount}` }),
            isEqualEventArgObj({ tokenType: "2", token: erc721Instance.target, tokenId: "2", amount: `${amount}` }),
          );

        await randomRequest(exchangeInstance, vrfInstance, 54321n);

        const newTokenId = await erc721Instance.totalSupply();
        const newTokenOwner = await erc721Instance.ownerOf(newTokenId);
        expect(newTokenOwner).to.equal(receiver.address);

        const newGenes = await erc721Instance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);
        expect(newGenes).to.equal(12345);
      });

      it("should fail: NotOwnerNorApproved", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const genes = 12345;

        const exchangeInstance = await factory();
        const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

        const tx01 = await erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintGenes(receiver.address, 1, genes);
        await erc721Instance.mintGenes(receiver.address, 2, genes);

        const generateSignature = await getSignatures(exchangeInstance);

        const mother = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 1n,
          amount,
        };

        const father = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 2n,
          amount,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: mother,
          price: father,
        });

        const breedTx = exchangeInstance.connect(receiver).breed(params, mother, father, signature);

        await expect(breedTx).to.be.revertedWithCustomError(erc721Instance, "NotOwnerNorApproved");
      });

      it("should fail: PregnancyFrequencyExceeded", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const genes = 12345;

        const exchangeInstance = await factory();
        const erc721Instance = await deployErc721Base("ERC721GenesHardhat", exchangeInstance);

        const tx01 = await erc721Instance.setSubscriptionId(subId);
        await expect(tx01).to.emit(erc721Instance, "VrfSubscriptionSet").withArgs(subId);

        const tx02 = await vrfInstance.addConsumer(subId, erc721Instance);
        await expect(tx02).to.emit(vrfInstance, "SubscriptionConsumerAdded").withArgs(subId, erc721Instance);

        await erc721Instance.mintGenes(receiver.address, 1, genes);
        await erc721Instance.mintGenes(receiver.address, 2, genes);

        await erc721Instance.connect(receiver).approve(exchangeInstance.target, 1);
        await erc721Instance.connect(receiver).approve(exchangeInstance.target, 2);

        const generateSignature = await getSignatures(exchangeInstance);

        const mother = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 1n,
          amount,
        };

        const father = {
          tokenType: 2,
          token: erc721Instance.target,
          tokenId: 2n,
          amount,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          item: mother,
          price: father,
        });

        await exchangeInstance.connect(receiver).breed(params, mother, father, signature);

        const signature2 = await generateSignature({
          account: receiver.address,
          params: {
            ...params,
            nonce,
          },
          item: mother,
          price: father,
        });

        const breedTx = exchangeInstance.connect(receiver).breed(params, mother, father, signature2);

        await expect(breedTx).to.be.revertedWithCustomError(exchangeInstance, "PregnancyFrequencyExceeded");
      });

      it("should fail: PregnancyThresholdExceeded", async function () {});

      it("should fail: SignerMissingRole", async function () {});

      it("should fail: GenesDifferentContracts", async function () {});

      it("should fail: EnforcedPause", async function () {});
    });
  });
});
