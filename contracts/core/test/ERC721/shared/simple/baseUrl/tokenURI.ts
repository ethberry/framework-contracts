import { expect } from "chai";
import { ethers } from "hardhat";

import { baseTokenURI } from "@gemunion/contracts-constants";
import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";

import { tokenId } from "../../../../constants";
import { customMintCommonERC721 } from "../../customMintFn";

export function shouldTokenURI(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  const { mint = customMintCommonERC721, tokenId: defaultTokenId = tokenId } = options;
  describe("tokenURI", function () {
    it("should get token uri", async function () {
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner.address);
      const uri = await contractInstance.tokenURI(defaultTokenId);
      expect(uri).to.equal(`${baseTokenURI}/${(await contractInstance.getAddress()).toLowerCase()}/${defaultTokenId}`);
    });

    // setTokenURI is not supported

    it("should fail: URI query for nonexistent token", async function () {
      const contractInstance = await factory();

      const uri = contractInstance.tokenURI(defaultTokenId);
      await expect(uri)
        .to.be.revertedWithCustomError(contractInstance, "ERC721NonexistentToken")
        .withArgs(defaultTokenId);
    });
  });
}
