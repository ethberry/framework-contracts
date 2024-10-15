import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, encodeBytes32String, ZeroAddress } from "ethers";

import { expiresAt, externalId, extra, tokenId } from "../constants";
import { deployCollection } from "../Mechanics/Collection/shared/fixtures";
import { isEqualEventArgArrObj } from "../utils";
import { deployDiamond, wrapManyToManySignature } from "./shared";

describe("Diamond Exchange Claim (Collection)", function () {
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

  describe("spend", function () {
    describe("ERC721", function () {
      it("should spend", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const generateSignature = await getSignatures(exchangeInstance);

        // DEPLOY ERC721 Collection
        const batchSize = 10n;
        const erc721CollectionInstance = await deployCollection("ERC721CBlacklist", batchSize);
        // TEST deploy?

        // APPROVE
        const tx01 = erc721CollectionInstance.setApprovalForAll(exchangeInstance, true);
        await expect(tx01)
          .to.emit(erc721CollectionInstance, "ApprovalForAll")
          .withArgs(owner.address, exchangeInstance, true);

        const params = {
          externalId,
          expiresAt,
          nonce: encodeBytes32String("nonce"),
          extra,
          receiver: owner.address, // initial owner of token
          referrer: ZeroAddress,
        };

        const signature = await generateSignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 2,
              token: await erc721CollectionInstance.getAddress(),
              tokenId,
              amount: 1n,
            },
          ],
          price: [],
        });

        const tx1 = exchangeInstance.connect(receiver).spend(
          params,
          [
            {
              tokenType: 2,
              token: erc721CollectionInstance,
              tokenId,
              amount: 1n,
            },
          ],
          signature,
        );

        await expect(tx1)
          .to.emit(exchangeInstance, "Claim")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj({
              tokenType: 2n,
              token: await erc721CollectionInstance.getAddress(),
              tokenId,
              amount: 1n,
            }),
          )
          .to.emit(erc721CollectionInstance, "Transfer")
          .withArgs(owner.address, receiver.address, tokenId);

        const balance = await erc721CollectionInstance.balanceOf(receiver.address);
        expect(balance).to.equal(1);
      });
    });
  });
});
