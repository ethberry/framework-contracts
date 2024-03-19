import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, encodeBytes32String, ZeroAddress } from "ethers";

import { amount, MINTER_ROLE } from "@gemunion/contracts-constants";

import { deployDiamond, deployErc1155Base, deployErc20Base, deployErc721Base } from "./shared";
import { isEqualEventArgArrObj } from "../utils";
import { expiresAt, externalId, extra, params, tokenId } from "../constants";
import { wrapManyToManySignature, wrapOneToManySignature, wrapOneToOneSignature } from "./shared/utils";

describe("Diamond Exchange MysteryBox", function () {
  const factory = async (facetName = "ExchangeMysteryBoxFacet"): Promise<any> => {
    const diamondInstance = await deployDiamond(
      "DiamondExchange",
      [facetName, "AccessControlFacet", "PausableFacet", "WalletFacet"],
      "DiamondExchangeInit",
      {
        logSelectors: false,
      },
    );
    return ethers.getContractAt(facetName, await diamondInstance.getAddress());
  };

  const getSignatures = async (contractInstance: Contract) => {
    const [owner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const generateOneToOneSignature = wrapOneToOneSignature(network, contractInstance, "EXCHANGE", owner);
    const generateOneToManySignature = wrapOneToManySignature(network, contractInstance, "EXCHANGE", owner);
    const generateManyToManySignature = wrapManyToManySignature(network, contractInstance, "EXCHANGE", owner);

    return {
      generateOneToOneSignature,
      generateOneToManySignature,
      generateManyToManySignature,
    };
  };

  describe("MysteryBox", function () {
    describe("NATIVE > MYSTERYBOX (ERC721)", function () {
      it("should purchase mysterybox", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);

        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
        const mysteryboxInstance = await deployErc721Base("ERC721MysteryBoxSimple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).purchaseMystery(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          signature,
          {
            value: amount,
          },
        );

        await expect(tx1)
          // .to.changeEtherBalance(receiver, -amount)
          .to.emit(exchangeInstance, "PurchaseMysteryBox")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj(
              {
                tokenType: 2n,
                token: await erc721Instance.getAddress(),
                tokenId,
                amount: 1n,
              },
              {
                tokenType: 2n,
                token: await mysteryboxInstance.getAddress(),
                tokenId,
                amount: 1n,
              },
            ),
            isEqualEventArgArrObj({
              tokenType: 0n,
              token: ZeroAddress,
              tokenId,
              amount,
            }),
          )
          .to.emit(mysteryboxInstance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);

        await expect(tx1).to.changeEtherBalances([owner, receiver], [amount, -amount]);
      });
    });

    describe("NATIVE > MYSTERYBOX (ERC1155)", function () {
      it("should purchase mysterybox", async function () {
        const [_owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);

        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);
        const mysteryboxInstance = await deployErc721Base("ERC721MysteryBoxSimple", exchangeInstance);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params,
          items: [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).purchaseMystery(
          params,
          [
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
          ],
          signature,
          {
            value: amount,
          },
        );

        await expect(tx1)
          // .to.changeEtherBalance(receiver, -amount)
          .to.emit(exchangeInstance, "PurchaseMysteryBox")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj(
              {
                tokenType: 4n,
                token: await erc1155Instance.getAddress(),
                tokenId,
                amount: 1n,
              },
              {
                tokenType: 2n,
                token: await mysteryboxInstance.getAddress(),
                tokenId,
                amount: 1n,
              },
            ),
            isEqualEventArgArrObj({
              tokenType: 0n,
              token: ZeroAddress,
              tokenId,
              amount,
            }),
          )
          .to.emit(mysteryboxInstance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId);
      });
    });

    describe("(NATIVE ERC20) > MYSTERYBOX MIXED (ERC20 ERC721 ERC998 ERC1155)", function () {
      it("should purchase mysterybox", async function () {
        const [owner, receiver] = await ethers.getSigners();
        const exchangeInstance = await factory();
        const { generateManyToManySignature } = await getSignatures(exchangeInstance);

        const erc20Instance = await deployErc20Base("ERC20Simple", exchangeInstance);
        const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
        const erc998Instance = await deployErc721Base("ERC998Simple", exchangeInstance);
        const erc1155Instance = await deployErc1155Base("ERC1155Simple", exchangeInstance);

        const mysteryboxInstance = await deployErc721Base("ERC721MysteryBoxSimple", exchangeInstance);

        await erc20Instance.mint(receiver.address, amount);
        await erc20Instance.connect(receiver).approve(await exchangeInstance.getAddress(), amount);

        const signature = await generateManyToManySignature({
          account: receiver.address,
          params: {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          items: [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 3,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          price: [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
        });

        const tx1 = exchangeInstance.connect(receiver).purchaseMystery(
          {
            nonce: encodeBytes32String("nonce"),
            externalId,
            expiresAt,
            receiver: owner.address,
            referrer: ZeroAddress,
            extra,
          },
          [
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
            {
              tokenType: 2,
              token: await erc721Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 3,
              token: await erc998Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 4,
              token: await erc1155Instance.getAddress(),
              tokenId,
              amount: 1,
            },
            {
              tokenType: 2,
              token: await mysteryboxInstance.getAddress(),
              tokenId,
              amount: 1,
            },
          ],
          [
            {
              tokenType: 0,
              token: ZeroAddress,
              tokenId,
              amount,
            },
            {
              tokenType: 1,
              token: await erc20Instance.getAddress(),
              tokenId,
              amount,
            },
          ],
          signature,
          {
            value: amount,
          },
        );

        await expect(tx1)
          // .to.changeEtherBalance(receiver, -amount)
          .to.emit(exchangeInstance, "PurchaseMysteryBox")
          .withArgs(
            receiver.address,
            externalId,
            isEqualEventArgArrObj(
              {
                tokenType: 1n,
                token: await erc20Instance.getAddress(),
                tokenId,
                amount,
              },
              {
                tokenType: 2n,
                token: await erc721Instance.getAddress(),
                tokenId,
                amount: 1n,
              },
              {
                tokenType: 3n,
                token: await erc998Instance.getAddress(),
                tokenId,
                amount: 1n,
              },
              {
                tokenType: 4n,
                token: await erc1155Instance.getAddress(),
                tokenId,
                amount: 1n,
              },
              {
                tokenType: 2n,
                token: await mysteryboxInstance.getAddress(),
                tokenId,
                amount: 1n,
              },
            ),
            isEqualEventArgArrObj(
              {
                tokenType: 0n,
                token: ZeroAddress,
                tokenId,
                amount,
              },
              {
                tokenType: 1n,
                token: await erc20Instance.getAddress(),
                tokenId,
                amount,
              },
            ),
          )
          .to.emit(mysteryboxInstance, "Transfer")
          .withArgs(ZeroAddress, receiver.address, tokenId)
          .to.emit(erc20Instance, "Transfer")
          .withArgs(receiver.address, owner.address, amount);
        await expect(tx1).changeEtherBalances([owner, receiver], [amount, -amount]);
        await expect(tx1).changeTokenBalances(erc20Instance, [owner, receiver], [amount, -amount]);
      });
    });
  });

  describe("ERROR", function () {
    it("should fail: SignerMissingRole", async function () {
      const [owner, receiver] = await ethers.getSigners();
      const exchangeInstance = await factory();
      const { generateManyToManySignature } = await getSignatures(exchangeInstance);

      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
      const mysteryboxInstance = await deployErc721Base("ERC721MysteryBoxSimple", exchangeInstance);

      const signature = await generateManyToManySignature({
        account: receiver.address,
        params: {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: owner.address,
          referrer: ZeroAddress,
          extra,
        },
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          {
            tokenType: 2,
            token: await mysteryboxInstance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
      });

      const accessInstance = await ethers.getContractAt("AccessControlFacet", await exchangeInstance.getAddress());
      await accessInstance.renounceRole(MINTER_ROLE, owner.address);

      const tx1 = exchangeInstance.connect(receiver).purchaseMystery(
        {
          nonce: encodeBytes32String("nonce"),
          externalId,
          expiresAt,
          receiver: owner.address,
          referrer: ZeroAddress,
          extra,
        },
        [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          {
            tokenType: 2,
            token: await mysteryboxInstance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        signature,
        {
          value: amount,
        },
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "SignerMissingRole");
    });

    it("should fail: EnforcedPause", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const exchangeInstance = await factory();
      const { generateManyToManySignature } = await getSignatures(exchangeInstance);

      const pausableInstance = await ethers.getContractAt("PausableFacet", await exchangeInstance.getAddress());
      await pausableInstance.pause();

      const erc721Instance = await deployErc721Base("ERC721Simple", exchangeInstance);
      const mysteryboxInstance = await deployErc721Base("ERC721MysteryBoxSimple", exchangeInstance);

      const signature = await generateManyToManySignature({
        account: receiver.address,
        params,
        items: [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          {
            tokenType: 2,
            token: await mysteryboxInstance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        price: [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
      });

      const tx1 = exchangeInstance.connect(receiver).purchaseMystery(
        params,
        [
          {
            tokenType: 2,
            token: await erc721Instance.getAddress(),
            tokenId,
            amount: 1,
          },
          {
            tokenType: 2,
            token: await mysteryboxInstance.getAddress(),
            tokenId,
            amount: 1,
          },
        ],
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId,
            amount,
          },
        ],
        signature,
        {
          value: amount,
        },
      );

      await expect(tx1).to.be.revertedWithCustomError(exchangeInstance, "EnforcedPause");
    });
  });
});
