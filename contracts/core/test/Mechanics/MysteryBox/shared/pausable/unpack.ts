import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import type { IERC721EnumOptions } from "@ethberry/contracts-erc721e";
import { shouldBehaveLikePausable } from "@ethberry/contracts-utils";

import { tokenId } from "../../../../constants";
import { customMint } from "../simple/customMintFn";

export function shouldBehaveLikeERC721MysteryBoxPausable(
  factory: () => Promise<any>,
  options: IERC721EnumOptions = {},
) {
  const { mint = customMint } = options;

  shouldBehaveLikePausable(factory);

  describe("Unpack box", function () {
    it("should fail to unpack: paused", async function () {
      const [owner] = await ethers.getSigners();

      const mysteryBoxInstance = await factory();
      const tx1 = mint(mysteryBoxInstance, owner, owner.address);
      await expect(tx1).to.emit(mysteryBoxInstance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);

      await mysteryBoxInstance.pause();

      const tx2 = mysteryBoxInstance.unpack(tokenId);
      await expect(tx2).to.be.revertedWithCustomError(mysteryBoxInstance, "EnforcedPause");
    });
  });
}
