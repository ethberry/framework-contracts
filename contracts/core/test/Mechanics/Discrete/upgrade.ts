import { expect } from "chai";
import { ethers } from "hardhat";

import { METADATA_ROLE } from "@gemunion/contracts-constants";

import { FrameworkInterfaceId, templateId, tokenAttributes, tokenId } from "../../constants";

export function shouldBehaveLikeDiscrete(factory: () => Promise<any>) {
  describe("upgrade", function () {
    it("should: upgrade level", async function () {
      const [owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      await contractInstance.mintCommon(receiver.address, templateId);

      const tx = contractInstance.upgrade(tokenId, tokenAttributes.LEVEL);
      await expect(tx)
        .to.emit(contractInstance, "LevelUp")
        .withArgs(owner.address, tokenId, tokenAttributes.LEVEL, 1)
        .to.emit(contractInstance, "MetadataUpdate")
        .withArgs(tokenId);

      const value = await contractInstance.getRecordFieldValue(tokenId, tokenAttributes.LEVEL);

      expect(value).to.equal(1);
    });

    it("should fail: upgrade protected property", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      await contractInstance.mintCommon(receiver.address, templateId);

      const tx = contractInstance.upgrade(tokenId, tokenAttributes.TEMPLATE_ID);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "ProtectedAttribute")
        .withArgs(tokenAttributes.TEMPLATE_ID);

      const isSupported = await contractInstance.supportsInterface(FrameworkInterfaceId.ERC721Random);
      if (isSupported) {
        const tx = contractInstance.upgrade(tokenId, tokenAttributes.RARITY);
        await expect(tx)
          .to.be.revertedWithCustomError(contractInstance, "ProtectedAttribute")
          .withArgs(tokenAttributes.RARITY);
      }
    });

    it("should fail: get level for unregistered property", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      await contractInstance.mintCommon(receiver.address, templateId);

      const tx = contractInstance.getRecordFieldValue(tokenId, tokenAttributes.LEVEL);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "FieldNotFound")
        .withArgs(tokenId, tokenAttributes.LEVEL);
    });

    it("should fail: wrong role", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      await contractInstance.mintCommon(receiver.address, templateId);

      const tx = contractInstance.connect(receiver).upgrade(tokenId, tokenAttributes.LEVEL);
      await expect(tx)
        .to.be.revertedWithCustomError(contractInstance, "AccessControlUnauthorizedAccount")
        .withArgs(receiver.address, METADATA_ROLE);
    });
  });
}
