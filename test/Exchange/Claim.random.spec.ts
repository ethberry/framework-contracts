import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ZeroAddress } from "ethers";

import { externalId, params, tokenId } from "../constants";
import { deployDiamond, deployErc721Base, deployErc998Base, wrapManyToManySignature } from "./shared";
import { isEqualEventArgArrObj } from "../utils";

describe("Diamond Exchange Claim (Random)", function () {
  const factory = async (facetName = "ExchangeClaimFacet"): Promise<any> => {
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
    return wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);
  };

  describe("claim", function () {
    describe("ERC721", function () {
      it("should claim (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Random", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc721Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "ClaimTemplate")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721Instance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);

        const balance = await erc721Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });

    describe("ERC998", function () {
      it("should claim (Random)", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);
        const erc998Instance = await deployErc998Base("ERC998Random", exchangeInstance);

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).claim(
          params,
          [
            {
              tokenType: 2,
              token: erc998Instance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "ClaimTemplate")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc998Instance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);

        const balance = await erc998Instance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });
  });
});
