import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import { IERC721Options } from "@gemunion/contracts-erc721";

import { tokenId } from "../../../../../constants";

export function shouldMintConsecutive(factory: () => Promise<any>, options: IERC721Options = {}) {
  const { batchSize = 0n } = options;

  describe("mintConsecutive", function () {
    it("should fail: token already minted", async function () {
      const [_owner, receiver] = await ethers.getSigners();

      const contractInstance = await factory();

      const tx1 = contractInstance.mintConsecutive(receiver.address, batchSize + tokenId);
      await expect(tx1)
        .to.emit(contractInstance, "Transfer")
        .withArgs(ZeroAddress, receiver.address, batchSize + tokenId);

      const tx2 = contractInstance.mintConsecutive(receiver.address, batchSize + tokenId);
      await expect(tx2).to.be.revertedWithCustomError(contractInstance, "ERC721InvalidSender").withArgs(ZeroAddress);
    });
  });
}
