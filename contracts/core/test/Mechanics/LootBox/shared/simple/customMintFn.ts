import { BaseContract, Signer } from "ethers";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { MINTER_ROLE } from "@gemunion/contracts-constants";

import { templateId } from "../../../../constants";
import { deployERC721 } from "../../../../ERC721/shared/fixtures";

export const customMint = async (
  mysteryBoxInstance: any,
  signer: Signer,
  receiver: SignerWithAddress | BaseContract | string,
) => {
  const erc721Factory = (name: string) => deployERC721(name);

  const erc721SimpleInstance = await erc721Factory("ERC721Simple");
  await erc721SimpleInstance.grantRole(MINTER_ROLE, await mysteryBoxInstance.getAddress());

  return mysteryBoxInstance.connect(signer).mintBox(
    receiver,
    templateId,
    [
      {
        tokenType: 2,
        token: await erc721SimpleInstance.getAddress(),
        tokenId: templateId,
        amount: 1n,
      },
    ],
    { min: 1, max: 1 },
  ) as Promise<any>;
};
