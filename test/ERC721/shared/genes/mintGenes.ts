import { expect } from "chai";
import { ethers } from "hardhat";

import { fatherGenes, templateId, tokenAttributes } from "../../../constants";

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

    it("should fail: TemplateZero", async function () {
      const [owner] = await ethers.getSigners();
      const erc721Instance = await factory();

      await expect(erc721Instance.mintGenes(owner, 0, fatherGenes)).to.be.revertedWithCustomError(
        erc721Instance,
        "TemplateZero",
      );
    });

    it("should fail: InvalidGenes", async function () {
      const [owner] = await ethers.getSigners();
      const erc721Instance = await factory();

      await expect(erc721Instance.mintGenes(owner, templateId, 12345)).to.be.revertedWithCustomError(
        erc721Instance,
        "InvalidGenes",
      );
    });
  });
}
