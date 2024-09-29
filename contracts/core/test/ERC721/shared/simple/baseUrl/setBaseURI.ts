import { expect } from "chai";
import { ethers } from "hardhat";

import type { IERC721EnumOptions } from "@ethberry/contracts-erc721e";

import { tokenId } from "../../../../constants";
import { customMintCommonERC721 } from "../../customMintFn";

export function shouldSetBaseURI(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  const { mint = customMintCommonERC721, tokenId: defaultTokenId = tokenId } = options;
  describe("setBaseURI", function () {
    it("should set token uri", async function () {
      const newURI = "http://example.com/";
      const [owner] = await ethers.getSigners();
      const contractInstance = await factory();

      await mint(contractInstance, owner, owner);
      const tx = contractInstance.setBaseURI(newURI);

      await expect(tx).to.emit(contractInstance, "BaseURIUpdate").withArgs(newURI);

      const uri = await contractInstance.tokenURI(defaultTokenId);
      expect(uri).to.equal(`${newURI}/${(await contractInstance.getAddress()).toLowerCase()}/${defaultTokenId}`);
    });
  });
}
