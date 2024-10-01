import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroAddress } from "ethers";

import type { IERC721EnumOptions } from "@ethberry/contracts-erc721e";
import { shouldBehaveLikePausable } from "@ethberry/contracts-utils";

import { tokenId } from "../../../../constants";
import { customMint } from "../simple/customMintFn";

export function shouldBehaveLikeERC721LootBoxPausable(factory: () => Promise<any>, options: IERC721EnumOptions = {}) {
  const { mint = customMint } = options;

  shouldBehaveLikePausable(factory);

  describe("Unpack box", function () {
    it("should fail to unpack: paused", async function () {
      const [owner] = await ethers.getSigners();

      const lootboxInstance = await factory();
      const tx1 = mint(lootboxInstance, owner, owner.address);
      await expect(tx1).to.emit(lootboxInstance, "Transfer").withArgs(ZeroAddress, owner.address, tokenId);

      await lootboxInstance.pause();

      const tx2 = lootboxInstance.unpack(tokenId);
      await expect(tx2).to.be.revertedWithCustomError(lootboxInstance, "EnforcedPause");
    });
  });
}
