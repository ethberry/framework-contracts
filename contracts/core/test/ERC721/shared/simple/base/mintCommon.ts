import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { FrameworkInterfaceId, templateId, tokenAttributes, tokenId } from "../../../../constants";

export function shouldMintCommon(factory: () => Promise<any>) {
  describe("mintCommon", function () {
    it("should mintCommon", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintCommon(receiver.address, templateId);
      await expect(tx).to.emit(contractInstance, "Transfer").withArgs(ZeroAddress, receiver.address, tokenId);

      const value1 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.TEMPLATE_ID);
      expect(value1).to.equal(templateId);

      const isSupported = await contractInstance.supportsInterface(FrameworkInterfaceId.ERC721Random);
      if (isSupported) {
        const value2 = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.RARITY);
        expect(value2).to.equal(0);
      }
    });

    it("should fail: TemplateZero", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx = contractInstance.mintCommon(receiver.address, 0);
      await expect(tx).to.be.revertedWithCustomError(contractInstance, "TemplateZero");
    });
  });
}
