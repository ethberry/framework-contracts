import { expect } from "chai";
import { ethers } from "hardhat";

import { baseTokenURI } from "@gemunion/contracts-constants";
import type { IERC721Options } from "@gemunion/contracts-erc721";

import { tokenId } from "../../../../../constants";
import { customMintConsecutive } from "../../customMintFn";

export function shouldTokenURI(factory: () => Promise<any>, options: IERC721Options = {}) {
  const { mint = customMintConsecutive, batchSize = 0n, tokenId: defaultTokenId = tokenId } = options;
  describe("tokenURI", function () {
    it("should get token uri", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address, batchSize + defaultTokenId);
      const uri = await contractInstance.tokenURI(batchSize + defaultTokenId);
      expect(uri).to.equal(
        `${baseTokenURI}/${(await contractInstance.getAddress()).toLowerCase()}/${batchSize + defaultTokenId}`,
      );
    });

    // setTokenURI is not supported

    it("should fail: ERC721NonexistentToken", async function () {
      const contractInstance = await factory();

      const uri = contractInstance.tokenURI(batchSize + defaultTokenId);
      await expect(uri)
        .to.be.revertedWithCustomError(contractInstance, "ERC721NonexistentToken")
        .withArgs(batchSize + defaultTokenId);
    });
  });
}
