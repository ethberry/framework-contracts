import { expect } from "chai";
import { ethers } from "hardhat";

import { tokenAttributes, fatherGenes, motherGenes } from "../../../constants";

export function shouldMintGenes(factory: () => Promise<any>) {
  describe("mintGenes", function () {
    it("should mint a new token with genes", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const erc721Instance = await factory();

      const tx = await erc721Instance.mintGenes(receiver, 1, fatherGenes);
      await expect(tx).to.emit(erc721Instance, "Transfer").withArgs(ethers.ZeroAddress, receiver, 1);

      const newTokenId = await erc721Instance.totalSupply();
      const newTokenOwner = await erc721Instance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver);

      const genes = await erc721Instance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);
      expect(genes).to.equal(fatherGenes);
    });

    it("should fail: TemplateZero when mint with templateId zero", async function () {
      const [owner] = await ethers.getSigners();
      const erc721Instance = await factory();

      await expect(erc721Instance.mintGenes(owner, 0, fatherGenes)).to.be.revertedWithCustomError(
        erc721Instance,
        "TemplateZero",
      );
    });

    it("should fail: InvalidGenes when mint with invalid genes", async function () {
      const [owner] = await ethers.getSigners();
      const erc721Instance = await factory();

      await expect(erc721Instance.mintGenes(owner, 1, 12345)).to.be.revertedWithCustomError(
        erc721Instance,
        "InvalidGenes",
      );
    });

    it("should mint multiple tokens with different genes", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const erc721Instance = await factory();

      const tx1 = await erc721Instance.mintGenes(receiver, 1, fatherGenes);
      await expect(tx1).to.emit(erc721Instance, "Transfer").withArgs(ethers.ZeroAddress, receiver, 1);

      const tx2 = await erc721Instance.mintGenes(receiver, 2, motherGenes);
      await expect(tx2).to.emit(erc721Instance, "Transfer").withArgs(ethers.ZeroAddress, receiver, 2);

      const genes1 = await erc721Instance.getRecordFieldValue(1, tokenAttributes.GENES);
      expect(genes1).to.equal(fatherGenes);

      const genes2 = await erc721Instance.getRecordFieldValue(2, tokenAttributes.GENES);
      expect(genes2).to.equal(motherGenes);
    });
  });
}
