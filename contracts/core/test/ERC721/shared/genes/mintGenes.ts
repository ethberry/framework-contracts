import { expect } from "chai";
import { ethers } from "hardhat";

import { templateId, tokenAttributes, tokenId } from "../../../constants";

export function shouldMintGenes(factory: () => Promise<any>) {
  describe("mintGenes", function () {
    it("should mint a new token with genes", async function () {
      const [_owner, receiver] = await ethers.getSigners();
      const contractInstance = await factory();

      const tx = await contractInstance.mintGenes(receiver, 1, 12345);
      await expect(tx).to.emit(contractInstance, "Transfer").withArgs(ethers.ZeroAddress, receiver, 1);

      const newTokenId = await contractInstance.totalSupply();
      const newTokenOwner = await contractInstance.ownerOf(newTokenId);
      expect(newTokenOwner).to.equal(receiver);

      const genes = await contractInstance.getRecordFieldValue(newTokenId, tokenAttributes.GENES);
      expect(genes).to.equal(12345);
    });

    it("should fail to mint with templateId zero", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await expect(contractInstance.mintGenes(owner, 0, 12345)).to.be.revertedWithCustomError(
        contractInstance,
        "TemplateZero",
      );
    });
  });
}
