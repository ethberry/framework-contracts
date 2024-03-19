import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther, ZeroAddress } from "ethers";

import type { IERC721EnumOptions } from "@gemunion/contracts-erc721e";

import { tokenId } from "../../../../constants";
import { customMint } from "../simple/customMintFn";

export function shouldBehaveLikeERC721MysteryBoxPausable(
  factory: () => Promise<any>,
  options: IERC721EnumOptions = {},
) {
  const { mint = customMint } = options;

  describe("Unpack box", function () {
    it("should fail to unpack: paused", async function () {
      const [owner] = await ethers.getSigners();

      const mysteryboxInstance = await factory();
      await mysteryboxInstance.topUp(
        [
          {
            tokenType: 0,
            token: ZeroAddress,
            tokenId: 0,
            amount: parseEther("1.0"),
          },
        ],
        { value: parseEther("1.0") },
      );

      const tx1 = mint(mysteryboxInstance, owner, owner.address);
      await expect(tx1).to.emit(mysteryboxInstance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);

      await mysteryboxInstance.pause();

      const tx2 = mysteryboxInstance.unpack(tokenId);
      await expect(tx2).to.be.revertedWithCustomError(mysteryboxInstance, "EnforcedPause");
    });
  });
}
