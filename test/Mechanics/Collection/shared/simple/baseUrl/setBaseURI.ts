import { expect } from "chai";
import { ethers } from "hardhat";

import type { IERC721Options } from "@ethberry/contracts-erc721";

import { tokenId } from "../../../../../constants";
import { customMintConsecutive } from "../../customMintFn";

export function shouldSetBaseURI(factory: () => Promise<any>, options: IERC721Options = {}) {
  const { mint = customMintConsecutive, batchSize = 0n, tokenId: defaultTokenId = tokenId } = options;
  describe("setBaseURI", function () {
    it("should set token uri", async function () {
      const newURI = "http://example.com/";
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, batchSize + defaultTokenId);
      const tx = contractInstance.setBaseURI(newURI);

      await expect(tx).to.emit(contractInstance, "BaseURIUpdate").withArgs(newURI);

      const uri = await contractInstance.tokenURI(batchSize + defaultTokenId);
      expect(uri).to.equal(
        `${newURI}/${(await contractInstance.getAddress()).toLowerCase()}/${batchSize + defaultTokenId}`,
      );
    });
  });
}
